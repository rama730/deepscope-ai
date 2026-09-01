"use client";

import { ForgotPasswordForm } from "./ForgotPasswordForm";
import ForgotPasswordAnimation from "./ForgotPasswordAnimation";
import FlowBAuthLayout from "./FlowBAuthLayout";

export default function ForgotPasswordClient() {
    return (
        <FlowBAuthLayout
            title="Reset your password"
            subtitle="We’ll send you a link to reset your password if you have an account."
            animation={<ForgotPasswordAnimation />}
        >
            <ForgotPasswordForm />
        </FlowBAuthLayout>
    );
}
