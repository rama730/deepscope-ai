"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Error from "next/error";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html>
            <body>
                <Error statusCode={500} title="Global Application Error" />
            </body>
        </html>
    );
}
