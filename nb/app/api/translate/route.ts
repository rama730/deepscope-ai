import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { verifyCSRFToken, getCSRFTokenFromHeader } from '@/lib/csrf';
import { logger } from '@/lib/logger';
import { successResponse, errorResponse, csrfErrorResponse, validationErrorResponse } from '@/lib/api/response';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/api/rate-limit';
import { validateRequestBodySize, isValidLanguageCode } from '@/lib/api/validation';

/**
 * @route POST /api/translate
 * @description Translate post content using Google Translate API
 * @requiresAuth false
 * @rateLimitCategory translate
 * @requestBody { postId: string, targetLanguage: string }
 * @returns {Object} Translation data
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request body size
    const sizeCheck = validateRequestBodySize(request, 1024); // 1KB max
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Rate limiting
    const { identifier, type } = getRateLimitIdentifier(request, user.id);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'translate',
      RATE_LIMITS.TRANSLATE
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitResult.lockedUntil ? {
            "Retry-After": Math.ceil((new Date(rateLimitResult.lockedUntil).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }
    
    const body = await request.json() as {
      postId?: string;
      targetLanguage?: string;
    };

    const { postId, targetLanguage } = body;

    if (!postId || typeof postId !== 'string') {
      return validationErrorResponse('Post ID is required');
    }

    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return validationErrorResponse('Target language is required');
    }

    // Validate language code
    if (!isValidLanguageCode(targetLanguage)) {
      return validationErrorResponse('Invalid language code');
    }

    // Check if translation already exists
    const { data: existing } = await supabase
      .from('post_translations')
      .select('*')
      .eq('post_id', postId)
      .eq('target_language', targetLanguage)
      .single();

    if (existing) {
      return successResponse(existing);
    }

    // Get the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('content')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return errorResponse('Post not found', 404, 'POST_NOT_FOUND');
    }

    // Translate using Google Translate API
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    
    if (!apiKey) {
      // Fallback: return original content with a note
      logger.warn('Google Translate API key not configured');
      return successResponse({
        translated_content: `[Translation not available] ${post.content}`,
        target_language: targetLanguage,
        post_id: postId,
      });
    }

    // Set timeout for translation API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const translateResponse = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: post.content,
            target: targetLanguage,
            format: 'text',
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!translateResponse.ok) {
        throw new Error(`Translation API error: ${translateResponse.status}`);
      }

      const translateData = await translateResponse.json() as {
        data?: {
          translations?: Array<{ translatedText?: string }>;
        };
      };

      const translatedText = translateData.data?.translations?.[0]?.translatedText || post.content;

      // Save translation to database
      const { data: translation, error: saveError } = await supabase
        .from('post_translations')
        .insert({
          post_id: postId,
          target_language: targetLanguage,
          translated_content: translatedText,
        })
        .select()
        .single();

      if (saveError) {
        logger.error('Error saving translation', { error: saveError.message });
        // Return translation even if save fails
        return successResponse({ translated_content: translatedText, target_language: targetLanguage, post_id: postId });
      }

      return successResponse(translation);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Translation API error';
      logger.error('Translation API call failed', { error: errorMessage });
      throw fetchError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to translate post';
    logger.error('Error translating post', { error: errorMessage });
    return errorResponse('Failed to translate post', 500);
  }
}
