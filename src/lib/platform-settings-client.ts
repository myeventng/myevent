// /lib/platform-settings-client.ts

export function getDefaultPaystackConfig() {
  return {
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "",
  };
}

// If you need actual database values, create server actions
export async function fetchPlatformSettings() {
  try {
    const response = await fetch("/api/platform-settings", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch platform settings");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching platform settings:", error);
    return {
      maintenanceMode: false,
      paystackPublicKey: "",
      paystackSecretKey: "",
      minimumWithdrawal: 1000,
      maximumRefundDays: 30,
      autoApproveRefunds: false,
    };
  }
}
