import { Monitor, Smartphone, Tablet, Globe, Laptop } from "lucide-react";

export interface DeviceInfo {
    browser: string;
    os: string;
    deviceType: "desktop" | "mobile" | "tablet" | "unknown";
    icon: any;
}

export function parseUserAgent(ua: string): DeviceInfo {
    if (!ua) {
        return {
            browser: "Unknown Browser",
            os: "Unknown OS",
            deviceType: "unknown",
            icon: Globe
        };
    }

    const uaLower = ua.toLowerCase();
    
    // Detect OS
    let os = "Unknown OS";
    if (uaLower.includes("windows")) os = "Windows";
    else if (uaLower.includes("macintosh") || uaLower.includes("mac os") || uaLower.includes("mac_powerpc")) os = "macOS";
    else if (uaLower.includes("crkey") || uaLower.includes("chromecast")) os = "Chromecast";
    else if (uaLower.includes("cros")) os = "Chrome OS";
    else if (uaLower.includes("linux")) os = "Linux";
    else if (uaLower.includes("android")) os = "Android";
    else if (uaLower.includes("ios") || uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";

    // Detect Browser
    let browser = "Unknown Browser";
    if (uaLower.includes("firefox")) browser = "Firefox";
    else if (uaLower.includes("samsungbrowser")) browser = "Samsung Internet";
    else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";
    else if (uaLower.includes("edge") || uaLower.includes("edg")) browser = "Edge";
    else if (uaLower.includes("chrome") && !uaLower.includes("edge") && !uaLower.includes("opr")) browser = "Chrome";
    else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";

    // Detect Device Type and Icon
    let deviceType: DeviceInfo["deviceType"] = "desktop";
    let icon = Monitor;

    if (uaLower.includes("mobile") || uaLower.includes("android") || uaLower.includes("iphone")) {
        deviceType = "mobile";
        icon = Smartphone;
    } else if (uaLower.includes("ipad") || uaLower.includes("tablet")) {
        deviceType = "tablet";
        icon = Tablet;
    } else if (os === "macOS" || os === "Windows" || os === "Linux" || os === "Chrome OS") {
        deviceType = "desktop";
        icon = Laptop; // Use Laptop for desktop OSs usually imply computers
    }

    return {
        browser,
        os,
        deviceType,
        icon
    };
}
