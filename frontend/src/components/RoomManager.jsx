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
  const { data, isLoading, error, refetch } = useFetch((s) => getRooms({ branch_id: branchId }, s), [branchId], { failMessage: "Couldn't load rooms." });
  const [busyId, setBusyId] = useState(null);

  const toggle = async (room) => {
    const next = room.status === 'Maintenance' ? 'Available' : 'Maintenance';
    setBusyId(room.room_id);
    try {
      try {
        await setRoomStatus(room.room_id, next);
        toast.success(next === 'Maintenance' ? `Room ${room.room_number} marked maintenance` : `Room ${room.room_number} is back in service`);
      } catch (err) {
        // Maintenance set mid-stay: the API refuses Available (409) while a guest
        // is checked in, so the room goes back to Occupied instead.
        if (next !== 'Available' || err.response?.status !== 409) throw err;
        await setRoomStatus(room.room_id, 'Occupied');
        toast.success(`Room ${room.room_number} is back in service. A guest is checked in, so it shows as occupied.`);
      }
      refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  if (!data.length) return <p className="card px-4 py-6 text-sm text-ink-600">No rooms in this branch yet.</p>;

  const showBranch = !branchId;
  return (
    <div className="card relative overflow-x-auto">
      <table className="w-full min-w-[600px]" aria-label="Rooms">
        <thead>
          <tr className="bg-paper-200">
            {showBranch && <th scope="col" className="th">Branch</th>}
            <th scope="col" className="th">Room</th><th scope="col" className="th">Type</th><th scope="col" className="th text-right">Sleeps</th>
            <th scope="col" className="th text-right">Rate / night</th><th scope="col" className="th">Status</th><th scope="col" className="th"><span className="sr-only">Action</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {data.map((r) => (
            <tr key={r.room_id} className="hover:bg-paper-100">
              {showBranch && <td className="td">{r.branch.city}</td>}
              <td className="td font-medium tabular text-ink-900">{r.room_number}</td>
              <td className="td">{r.room_type.type_name}</td>
              <td className="td text-right tabular">{r.room_type.capacity}</td>
              <td className="td whitespace-nowrap text-right tabular">{formatCurrency(r.daily_rate)}</td>
              <td className="td"><Badge status={r.status} /></td>
              <td className="td text-right">
                {r.status === 'Occupied' ? (
                  <span className="text-2xs text-ink-600">Guest checked in</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busyId === r.room_id}
                    onClick={() => toggle(r)}
                    aria-label={`${r.status === 'Maintenance' ? 'Return to service' : 'Mark as maintenance'}: Room ${r.room_number}`}
                  >
                    {r.status === 'Maintenance' ? 'Return to service' : 'Mark as maintenance'}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
