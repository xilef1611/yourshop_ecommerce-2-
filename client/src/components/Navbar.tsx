import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { ShoppingCart, User, LogOut, Shield, Menu, X, Package, MessageSquare, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary hover:opacity-80 transition-opacity">
          <Package className="h-6 w-6" />
          <span>YourShop</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/" ? "text-primary" : "text-muted-foreground"}`}>
            Shop
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/orders" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/orders" ? "text-primary" : "text-muted-foreground"}`}>
                My Orders
              </Link>
              <Link href="/tickets" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/tickets" ? "text-primary" : "text-muted-foreground"}`}>
                Support
              </Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" className={`text-sm font-medium transition-colors hover:text-primary ${location.startsWith("/admin") ? "text-primary" : "text-muted-foreground"}`}>
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Admin</span>
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative">
            <Button variant="outline" size="icon" className="relative bg-transparent">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/account">
                <Button variant="outline" size="sm" className="bg-transparent gap-1.5">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">{user?.name || "Account"}</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <a href={getLoginUrl()} className="hidden md:block">
              <Button variant="default" size="sm" className="gap-1.5">
                <User className="h-4 w-4" />
                Login
              </Button>
            </a>
          )}

          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
          <Link href="/" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-primary">
            Shop
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/orders" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-primary">
                My Orders
              </Link>
              <Link href="/tickets" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-primary">
                Support
              </Link>
              <Link href="/account" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground hover:text-primary">
                Account
              </Link>
            </>
          )}
          {user?.role === "admin" && (
            <Link href="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-primary">
              Admin Dashboard
            </Link>
          )}
          {isAuthenticated ? (
            <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={() => { logout(); setMobileOpen(false); }}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          ) : (
            <a href={getLoginUrl()} className="block">
              <Button variant="default" size="sm" className="w-full">
                <User className="h-4 w-4 mr-2" /> Login
              </Button>
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
