interface PageContainerProps {
  children: React.ReactNode;
}

/**
 * Standard page content wrapper. Provides consistent max width and padding.
 */
export function PageContainer({ children }: PageContainerProps) {
  return <main className="container mx-auto px-4 py-8">{children}</main>;
}
