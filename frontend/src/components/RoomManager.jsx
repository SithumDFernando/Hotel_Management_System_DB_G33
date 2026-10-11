import { useState } from 'react';
import { getRooms, setRoomStatus } from '@/api/rooms';
import useFetch from '@/hooks/useFetch';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { errorMessage, formatCurrency } from '@/utils/formatters';

// Room inventory with a maintenance toggle (manager/admin). Occupied rooms are locked.
export default function RoomManager({ branchId }) {
  const toast = useToast();
  const { data, isLoading, error, refetch } = useFetch((s) => getRooms({ branch_id: branchId }, s), [branchId]);
  const [busyId, setBusyId] = useState(null);

  const toggle = async (room) => {
    const next = room.status === 'Maintenance' ? 'Available' : 'Maintenance';
    setBusyId(room.room_id);
    try {
      await setRoomStatus(room.room_id, next);
      toast.success(`Room ${room.room_number} marked ${next.toLowerCase()}`);
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead className="bg-navy-50">
          <tr><th className="th">Room</th><th className="th">Type</th><th className="th">Capacity</th><th className="th text-right">Rate / night</th><th className="th">Status</th><th className="th text-right">Action</th></tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {data.map((r) => (
            <tr key={r.room_id}>
              <td className="td font-semibold">{r.room_number}</td>
              <td className="td">{r.room_type.type_name}</td>
              <td className="td">{r.room_type.capacity}</td>
              <td className="td text-right tabular-nums">{formatCurrency(r.daily_rate)}</td>
              <td className="td"><Badge status={r.status} /></td>
              <td className="td text-right">
                <Button
                  size="sm"
                  variant="outline"
                  loading={busyId === r.room_id}
                  disabled={r.status === 'Occupied'}
                  title={r.status === 'Occupied' ? 'A guest is checked in' : undefined}
                  onClick={() => toggle(r)}
                >
                  {r.status === 'Maintenance' ? 'Mark available' : 'Set maintenance'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
