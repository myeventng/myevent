'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  DollarSign,
  Shield,
  Mail,
  Globe,
  Save,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminSettingsProps {
  session: any;
  isUserSuperAdmin: boolean;
}

interface PlatformSettings {
  general: {
    platformName: string;
    platformDescription: string;
    supportEmail: string;
    maintenanceMode: boolean;
    allowRegistrations: boolean;
  };
  financial: {
    defaultPlatformFeePercentage: number;
    minimumWithdrawal: number;
    maximumRefundDays: number;
    autoApproveRefunds: boolean;
    paystackPublicKey: string;
    paystackSecretKey: string;
  };
  features: {
    enableWaitingList: boolean;
    enableEventRatings: boolean;
    enableTicketTransfers: boolean;
    maxTicketsPerUser: number;
    enableEmailNotifications: boolean;
    enableSMSNotifications: boolean;
  };
  organizer: {
    requireApproval: boolean;
    maxEventsPerOrganizer: number;
    enableOrganizerVerification: boolean;
    defaultEventApproval: boolean;
  };
}

export function AdminSettings({
  session,
  isUserSuperAdmin,
}: AdminSettingsProps) {
  const [settings, setSettings] = useState<PlatformSettings>({
    general: {
      platformName: 'MyEvent.com.ng',
      platformDescription: "Nigeria's premier event management platform",
      supportEmail: 'support@myevent.com.ng',
      maintenanceMode: false,
      allowRegistrations: true,
    },
    financial: {
      defaultPlatformFeePercentage: 5,
      minimumWithdrawal: 1000,
      maximumRefundDays: 30,
      autoApproveRefunds: false,
      paystackPublicKey: '',
      paystackSecretKey: '',
    },
    features: {
      enableWaitingList: true,
      enableEventRatings: true,
      enableTicketTransfers: false,
      maxTicketsPerUser: 10,
      enableEmailNotifications: true,
      enableSMSNotifications: false,
    },
    organizer: {
      requireApproval: true,
      maxEventsPerOrganizer: 50,
      enableOrganizerVerification: true,
      defaultEventApproval: false,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load settings from API
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch from your API
      // const response = await getAdminSettings();
      // setSettings(response.data);

      // For now, using localStorage as mock storage
      const savedSettings = localStorage.getItem('adminSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Save settings to API
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would save to your API
      // const response = await updateAdminSettings(settings);

      // For now, using localStorage as mock storage
      localStorage.setItem('adminSettings', JSON.stringify(settings));

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Update settings helper
  const updateSetting = (
    section: keyof PlatformSettings,
    key: string,
    value: any
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Platform Settings
          </h1>
          <p className="text-muted-foreground">
            Configure platform-wide settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isUserSuperAdmin ? 'destructive' : 'secondary'}>
            {session.user.subRole}
          </Badge>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Permissions Alert */}
      {!isUserSuperAdmin && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Some settings may be restricted based on your admin level. Contact a
            Super Admin for full access.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="organizer">Organizers</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Platform Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={settings.general.platformName}
                    onChange={(e) =>
                      updateSetting('general', 'platformName', e.target.value)
                    }
                    placeholder="MyEvent.com.ng"
                  />
                </div>
                <div>
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) =>
                      updateSetting('general', 'supportEmail', e.target.value)
                    }
                    placeholder="support@myevent.com.ng"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="platformDescription">
                  Platform Description
                </Label>
                <Textarea
                  id="platformDescription"
                  value={settings.general.platformDescription}
                  onChange={(e) =>
                    updateSetting(
                      'general',
                      'platformDescription',
                      e.target.value
                    )
                  }
                  placeholder="Describe your platform..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Platform Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Temporarily disable the platform for maintenance
                  </p>
                </div>
                <Switch
                  checked={settings.general.maintenanceMode}
                  onCheckedChange={(checked) =>
                    updateSetting('general', 'maintenanceMode', checked)
                  }
                  disabled={!isUserSuperAdmin}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow New Registrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow new users to register on the platform
                  </p>
                </div>
                <Switch
                  checked={settings.general.allowRegistrations}
                  onCheckedChange={(checked) =>
                    updateSetting('general', 'allowRegistrations', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings */}
        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue & Fees
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="platformFee">Platform Fee Percentage</Label>
                  <Input
                    id="platformFee"
                    type="number"
                    min="0"
                    max="50"
                    step="0.1"
                    value={settings.financial.defaultPlatformFeePercentage}
                    onChange={(e) =>
                      updateSetting(
                        'financial',
                        'defaultPlatformFeePercentage',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={!isUserSuperAdmin}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Default fee charged on ticket sales
                  </p>
                </div>
                <div>
                  <Label htmlFor="minWithdrawal">Minimum Withdrawal (₦)</Label>
                  <Input
                    id="minWithdrawal"
                    type="number"
                    min="0"
                    value={settings.financial.minimumWithdrawal}
                    onChange={(e) =>
                      updateSetting(
                        'financial',
                        'minimumWithdrawal',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="refundDays">Maximum Refund Days</Label>
                  <Input
                    id="refundDays"
                    type="number"
                    min="0"
                    max="365"
                    value={settings.financial.maximumRefundDays}
                    onChange={(e) =>
                      updateSetting(
                        'financial',
                        'maximumRefundDays',
                        parseInt(e.target.value) || 0
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Days before event when refunds are allowed
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-approve Refunds</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve refund requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.financial.autoApproveRefunds}
                    onCheckedChange={(checked) =>
                      updateSetting('financial', 'autoApproveRefunds', checked)
                    }
                    disabled={!isUserSuperAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paystack Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure payment processing settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These keys are sensitive. Only Super Admins should have
                  access.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="paystackPublic">Paystack Public Key</Label>
                  <Input
                    id="paystackPublic"
                    type="password"
                    value={settings.financial.paystackPublicKey}
                    onChange={(e) =>
                      updateSetting(
                        'financial',
                        'paystackPublicKey',
                        e.target.value
                      )
                    }
                    placeholder="pk_..."
                    disabled={!isUserSuperAdmin}
                  />
                </div>
                <div>
                  <Label htmlFor="paystackSecret">Paystack Secret Key</Label>
                  <Input
                    id="paystackSecret"
                    type="password"
                    value={settings.financial.paystackSecretKey}
                    onChange={(e) =>
                      updateSetting(
                        'financial',
                        'paystackSecretKey',
                        e.target.value
                      )
                    }
                    placeholder="sk_..."
                    disabled={!isUserSuperAdmin}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Waiting Lists</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow users to join waiting lists for sold-out events
                      </p>
                    </div>
                    <Switch
                      checked={settings.features.enableTicketTransfers}
                      onCheckedChange={(checked) =>
                        updateSetting(
                          'features',
                          'enableTicketTransfers',
                          checked
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxTickets">Max Tickets per User</Label>
                    <Input
                      id="maxTickets"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.features.maxTicketsPerUser}
                      onChange={(e) =>
                        updateSetting(
                          'features',
                          'maxTicketsPerUser',
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum tickets a user can purchase per event
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for important events
                  </p>
                </div>
                <Switch
                  checked={settings.features.enableEmailNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting(
                      'features',
                      'enableEmailNotifications',
                      checked
                    )
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send SMS notifications (requires SMS provider setup)
                  </p>
                </div>
                <Switch
                  checked={settings.features.enableSMSNotifications}
                  onCheckedChange={(checked) =>
                    updateSetting('features', 'enableSMSNotifications', checked)
                  }
                  disabled={!isUserSuperAdmin}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizer Settings */}
        <TabsContent value="organizer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organizer Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Organizer Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        New organizers must be approved by admin
                      </p>
                    </div>
                    <Switch
                      checked={settings.organizer.requireApproval}
                      onCheckedChange={(checked) =>
                        updateSetting('organizer', 'requireApproval', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Organizer Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Require verification documents from organizers
                      </p>
                    </div>
                    <Switch
                      checked={settings.organizer.enableOrganizerVerification}
                      onCheckedChange={(checked) =>
                        updateSetting(
                          'organizer',
                          'enableOrganizerVerification',
                          checked
                        )
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-approve Events</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically approve events from verified organizers
                      </p>
                    </div>
                    <Switch
                      checked={settings.organizer.defaultEventApproval}
                      onCheckedChange={(checked) =>
                        updateSetting(
                          'organizer',
                          'defaultEventApproval',
                          checked
                        )
                      }
                      disabled={!isUserSuperAdmin}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxEvents">Max Events per Organizer</Label>
                    <Input
                      id="maxEvents"
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.organizer.maxEventsPerOrganizer}
                      onChange={(e) =>
                        updateSetting(
                          'organizer',
                          'maxEventsPerOrganizer',
                          parseInt(e.target.value) || 1
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum events an organizer can create
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Sharing</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure custom fee structures for specific organizers
              </p>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Custom organizer fees can be set individually in the organizer
                  management section. The default platform fee of{' '}
                  {settings.financial.defaultPlatformFeePercentage}% applies to
                  all new organizers.
                </AlertDescription>
              </Alert>

              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium mb-2">Current Fee Structure</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Default Platform Fee:</span>
                    <span className="font-medium">
                      {settings.financial.defaultPlatformFeePercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Processing Fee:</span>
                    <span className="font-medium">1.5% + ₦100 (Paystack)</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Organizer Revenue:</span>
                    <span className="font-medium">
                      {(
                        100 -
                        settings.financial.defaultPlatformFeePercentage -
                        1.5
                      ).toFixed(1)}
                      % - ₦100
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Security Notice</h4>
              <p className="text-sm text-amber-700 mt-1">
                Changes to financial settings and sensitive configurations are
                logged and monitored. Only make changes you understand and
                ensure all settings comply with your business requirements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={loadSettings} disabled={isLoading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Reset Changes
        </Button>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
