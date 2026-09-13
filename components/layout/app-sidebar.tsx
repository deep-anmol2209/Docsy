"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Home,
  Library,
  Clock,
  Plus,
  LayoutGrid,
  FileStack,
  MessageSquare,
  Sparkles,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronsUpDown,
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/shared/brand-mark";
import { authClient } from "@/lib/auth-client";
import { useWorkspaces } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";

const NOTEBOOK_NAV = [
  { label: "Overview", href: "", icon: LayoutGrid },
  { label: "Sources", href: "/sources", icon: FileStack },
  { label: "Chat", href: "/chat", icon: MessageSquare },
  { label: "Artifacts", href: "/artifacts", icon: Sparkles },
];

function initialsFromName(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams<{ notebookId?: string }>();
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const { workspaces } = useWorkspaces();

  const activeNotebookId = params?.notebookId;
  const recentWorkspaces = workspaces.slice(0, 5);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <div className="flex items-center justify-between px-2 pt-1">
          <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BrandMark className="size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
              Chaibook
            </span>
          </Link>
        </div>

        <div className="px-2 group-data-[collapsible=icon]:px-0">
          <Button
            render={<Link href="/dashboard?create=1" />}
            className="w-full justify-start gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Plus className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">New Notebook</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive={pathname === "/dashboard"}
                  tooltip="Home"
                >
                  <Home />
                  <span>Home</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/notebooks" />}
                  isActive={pathname === "/notebooks"}
                  tooltip="Notebooks"
                >
                  <Library />
                  <span>Notebooks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recentWorkspaces.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <Clock className="mr-1.5 size-3.5" />
              Recent
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentWorkspaces.map((workspace) => (
                  <SidebarMenuItem key={workspace.id}>
                    <SidebarMenuButton
                      render={<Link href={`/notebooks/${workspace.id}`} />}
                      isActive={activeNotebookId === workspace.id}
                      tooltip={workspace.title}
                    >
                      <span className="truncate">{workspace.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeNotebookId && (
          <SidebarGroup>
            <SidebarGroupLabel>Notebook</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NOTEBOOK_NAV.map((item) => {
                  const href = `/notebooks/${activeNotebookId}${item.href}`;
                  const isActive =
                    item.href === "" ? pathname === href : pathname.startsWith(href);

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton render={<Link href={href} />} isActive={isActive} tooltip={item.label}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

     <SidebarFooter>
  <SidebarSeparator className="mb-1" />

  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <SidebarMenuButton
          size="lg"
          className="data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
        />
      }
    >
      <Avatar size="sm">
        <AvatarImage
          src={session?.user?.image ?? undefined}
          alt=""
        />

        <AvatarFallback className="text-xs">
          {initialsFromName(session?.user?.name)}
        </AvatarFallback>
      </Avatar>

      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">
          {session?.user?.name ?? "Account"}
        </span>

        <span className="truncate text-xs text-muted-foreground">
          {session?.user?.email}
        </span>
      </div>

      <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
    </DropdownMenuTrigger>

    <DropdownMenuContent
      side="top"
      align="start"
      className="w-56"
    >
      {/* Account info */}
      <DropdownMenuGroup>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium">
              {session?.user?.name ?? "Account"}
            </span>

            <span className="truncate text-xs text-muted-foreground">
              {session?.user?.email}
            </span>
          </div>
        </DropdownMenuLabel>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      {/* Theme */}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Sun className="mr-2 size-4 rotate-0 scale-100 dark:hidden" />
          <Moon className="mr-2 hidden size-4 dark:block" />

          Theme
        </DropdownMenuSubTrigger>

        <DropdownMenuSubContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 size-4" />

              Light

              {theme === "light" && (
                <ThemeCheck />
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-2 size-4" />

              Dark

              {theme === "dark" && (
                <ThemeCheck />
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setTheme("system")}
            >
              <Monitor className="mr-2 size-4" />

              System

              {theme === "system" && (
                <ThemeCheck />
              )}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSeparator />

      {/* Sign out */}
      <DropdownMenuGroup>
        <DropdownMenuItem
          variant="destructive"
          onClick={() =>
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/sign-in";
                },
              },
            })
          }
        >
          <LogOut className="mr-2 size-4" />

          Sign out
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function ThemeCheck() {
  return <span className={cn("ml-auto size-1.5 rounded-full bg-primary")} />;
}