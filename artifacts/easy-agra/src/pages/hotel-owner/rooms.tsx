import { useState } from "react";
import { Link, useSearch } from "wouter";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useGetRoomStats,
  useListRooms,
  useListHotels,
  useDeleteRoom,
  useActivateRoom,
  useDeactivateRoom,
  useSetRoomMaintenance,
  useRestoreRoom,
  getListRoomsQueryKey,
  getGetRoomStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BedDouble,
  PlusCircle,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Wrench,
  Trash2,
  Pencil,
  RotateCcw,
  Users,
  IndianRupee,
  Layers,
  Building2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  premium: "Premium",
  family: "Family",
  executive: "Executive",
  suite: "Suite",
};

const BED_TYPE_LABELS: Record<string, string> = {
  single: "Single Bed",
  double: "Double Bed",
  queen: "Queen Bed",
  king: "King Bed",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", variant: "secondary" },
  active: { label: "Active", color: "bg-green-100 text-green-700", variant: "default" },
  inactive: { label: "Inactive", color: "bg-amber-100 text-amber-700", variant: "outline" },
  maintenance: { label: "Maintenance", color: "bg-orange-100 text-orange-700", variant: "outline" },
};

const AVAILABILITY_CONFIG = (available: number, total: number) => {
  if (available === 0) return { label: "Sold Out", color: "text-red-600" };
  if (available <= total * 0.2) return { label: "Limited", color: "text-amber-600" };
  return { label: "Available", color: "text-green-600" };
};

export default function HotelOwnerRooms() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hotelFilter, setHotelFilter] = useState("all");
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const { data: hotelsData } = useListHotels({ limit: 100 });
  const hotels = hotelsData?.hotels ?? [];

  const roomParams = {
    ...(hotelFilter !== "all" ? { hotelId: parseInt(hotelFilter, 10) } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(search ? { search } : {}),
    limit: 50,
  };

  const statsParams = hotelFilter !== "all" ? { hotelId: parseInt(hotelFilter, 10) } : {};

  const { data: stats } = useGetRoomStats(statsParams);
  const { data: roomsPage, isLoading } = useListRooms(roomParams);
  const rooms = roomsPage?.rooms ?? [];

  const deleteMutation = useDeleteRoom();
  const activateMutation = useActivateRoom();
  const deactivateMutation = useDeactivateRoom();
  const maintenanceMutation = useSetRoomMaintenance();
  const restoreMutation = useRestoreRoom();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRoomStatsQueryKey() });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget });
      toast({ title: "Room deleted" });
      invalidate();
    } catch {
      toast({ title: "Failed to delete room", variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleAction = async (
    action: "activate" | "deactivate" | "maintenance" | "restore",
    id: number,
    name: string
  ) => {
    try {
      if (action === "activate") await activateMutation.mutateAsync({ id });
      else if (action === "deactivate") await deactivateMutation.mutateAsync({ id });
      else if (action === "maintenance") await maintenanceMutation.mutateAsync({ id });
      else if (action === "restore") await restoreMutation.mutateAsync({ id });
      toast({ title: `Room "${name}" updated` });
      invalidate();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    }
  };

  const filteredRooms = showDeleted
    ? rooms
    : rooms.filter((r) => !r.deletedAt);

  const statCards = [
    { label: "Total", value: stats?.totalRooms ?? 0, icon: BedDouble, color: "text-blue-600 bg-blue-50" },
    { label: "Active", value: stats?.activeRooms ?? 0, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
    { label: "Inactive", value: stats?.inactiveRooms ?? 0, icon: XCircle, color: "text-amber-600 bg-amber-50" },
    { label: "Maintenance", value: stats?.maintenanceRooms ?? 0, icon: Wrench, color: "text-orange-600 bg-orange-50" },
    { label: "Available", value: stats?.totalAvailable ?? 0, icon: Layers, color: "text-teal-600 bg-teal-50" },
  ];

  return (
    <OwnerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">Room Management</h1>
            <p className="text-xs text-muted-foreground">Manage rooms for your hotels</p>
          </div>
          <Link href="/hotel-owner/rooms/new">
            <Button size="sm" className="gap-1.5 text-xs">
              <PlusCircle className="h-3.5 w-3.5" />
              Add Room
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-2">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl p-2 ${color} flex flex-col items-center gap-0.5`}>
              <Icon className="h-4 w-4" />
              <span className="text-base font-bold leading-none">{value}</span>
              <span className="text-[10px] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={hotelFilter} onValueChange={setHotelFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue placeholder="All Hotels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hotels</SelectItem>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? "Hide Deleted" : "Show Deleted"}
            </Button>
          </div>
        </div>

        {/* Room List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BedDouble className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No rooms found</p>
            <p className="text-xs text-muted-foreground/70 mb-4">
              Add your first room to get started
            </p>
            <Link href="/hotel-owner/rooms/new">
              <Button size="sm">
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Add Room
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const statusCfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.draft;
              const availCfg = AVAILABILITY_CONFIG(room.availableRooms, room.totalRooms);
              const isDeleted = !!room.deletedAt;

              return (
                <Card key={room.id} className={`overflow-hidden ${isDeleted ? "opacity-60" : ""}`}>
                  <CardContent className="p-0">
                    {/* Top section */}
                    <div className="flex gap-3 p-3">
                      {/* Room Icon */}
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BedDouble className="h-7 w-7 text-primary" />
                      </div>

                      {/* Room Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-sm text-foreground leading-tight">{room.name}</h3>
                            {room.roomNumber && (
                              <p className="text-xs text-muted-foreground">Room #{room.roomNumber}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isDeleted ? (
                              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Deleted</Badge>
                            ) : (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                            )}
                            {!isDeleted && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/hotel-owner/rooms/${room.id}/edit`}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" />
                                      Edit Room
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {room.status !== "active" && (
                                    <DropdownMenuItem
                                      className="text-green-700"
                                      onClick={() => handleAction("activate", room.id, room.name)}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                      Activate
                                    </DropdownMenuItem>
                                  )}
                                  {room.status === "active" && (
                                    <DropdownMenuItem
                                      className="text-amber-700"
                                      onClick={() => handleAction("deactivate", room.id, room.name)}
                                    >
                                      <XCircle className="h-3.5 w-3.5 mr-2" />
                                      Deactivate
                                    </DropdownMenuItem>
                                  )}
                                  {room.status !== "maintenance" && (
                                    <DropdownMenuItem
                                      className="text-orange-700"
                                      onClick={() => handleAction("maintenance", room.id, room.name)}
                                    >
                                      <Wrench className="h-3.5 w-3.5 mr-2" />
                                      Set Maintenance
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteTarget(room.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                                    Delete Room
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            {isDeleted && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleAction("restore", room.id, room.name)}
                              >
                                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs text-muted-foreground">
                            {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="text-xs text-muted-foreground">
                            {BED_TYPE_LABELS[room.bedType] ?? room.bedType}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom metrics row */}
                    <div className="border-t border-border/50 bg-muted/30 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs">
                          <IndianRupee className="h-3 w-3 text-primary" />
                          <span className="font-semibold text-primary">
                            {(room.finalPrice ?? room.basePrice).toLocaleString("en-IN")}
                          </span>
                          <span className="text-muted-foreground">/night</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{room.adultsCapacity + room.childrenCapacity} guests</span>
                        </div>
                      </div>
                      <div className={`text-xs font-medium ${availCfg.color}`}>
                        {room.availableRooms}/{room.totalRooms} {availCfg.label}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Total count */}
        {!isLoading && filteredRooms.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Showing {filteredRooms.length} of {roomsPage?.total ?? 0} rooms
          </p>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              This room will be soft-deleted and hidden from guests. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OwnerLayout>
  );
}
