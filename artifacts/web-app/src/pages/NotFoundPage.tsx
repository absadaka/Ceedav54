import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-semibold text-muted-foreground/20 mb-4">404</p>
        <h1 className="text-xl font-semibold text-foreground mb-2">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/">
          <Button size="sm">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
