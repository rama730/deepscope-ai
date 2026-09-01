"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportButtonProps {
    entity: "tasks" | "projects" | "applications";
    projectId?: string; // Required for tasks/applications
    className?: string;
}

export function ExportButton({ entity, projectId, className }: ExportButtonProps) {
    const [downloading, setDownloading] = useState(false);

    const handleExport = async (format: "csv" | "json") => {
        try {
            setDownloading(true);
            toast.info(`Preparing ${entity} export...`);

            const queryParams = new URLSearchParams({ format });
            if (projectId) queryParams.set("projectId", projectId);

            // Trigger download via fetch to handle errors gracefully, then blob
            const response = await fetch(`/api/v1/export/${entity}?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error("Export failed");
            }

            // Convert to blob and download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            // Get filename from header or default
            const disposition = response.headers.get("Content-Disposition");
            let filename = `${entity}-export.${format}`;
            if (disposition && disposition.includes("filename=")) {
                const parts = disposition.split("filename=");
                if (parts.length > 1 && parts[1]) {
                    filename = parts[1].replace(/"/g, "");
                }
            }

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Export complete!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download export.");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={className} disabled={downloading}>
                    {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Export as JSON
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
