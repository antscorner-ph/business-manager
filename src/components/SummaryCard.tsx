import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  subtitle?: string;
}

const variantStyles = {
  default: "bg-card border-border",
  success: "bg-success/10 border-success/30",
  warning: "bg-warning/10 border-warning/30",
  destructive: "bg-destructive/10 border-destructive/30",
};

const iconStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/20 text-success",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/20 text-destructive",
};

export function SummaryCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  subtitle,
}: SummaryCardProps) {
  return (
    <Card className={cn("border-2 transition-all hover:shadow-md", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn("rounded-xl p-3", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
