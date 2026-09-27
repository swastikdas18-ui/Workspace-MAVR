import { useState, useEffect } from 'react';
import { api } from '../../lib/api';

interface UsePeopleDataProps {
  currentRole: string;
  workspaceId?: string;
  loadInvites: () => Promise<void>;
}

export function usePeopleData({ currentRole, workspaceId, loadInvites }: UsePeopleDataProps) {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dirRes, deptRes, leaveRes, attTodayRes, attHistRes] = await Promise.allSettled([
        api.getEmployeeDirectory(),
        api.getDepartments(),
        api.getLeaveRequests(),
        api.getTodayAttendance(),
        api.getAttendanceHistory(),
      ]);

      if (dirRes.status === 'fulfilled' && dirRes.value?.profiles) setProfiles(dirRes.value.profiles);
      if (deptRes.status === 'fulfilled' && deptRes.value?.departments) setDepartments(deptRes.value.departments);
      if (leaveRes.status === 'fulfilled' && leaveRes.value?.leaves) setLeaves(leaveRes.value.leaves);
      if (attTodayRes.status === 'fulfilled' && attTodayRes.value) {
        setTodayAttendance(attTodayRes.value.record);
        setIsCheckedIn(attTodayRes.value.isCheckedIn);
      }
      if (attHistRes.status === 'fulfilled' && attHistRes.value?.history) setAttendanceHistory(attHistRes.value.history);
    } catch (err: any) {
      console.error('Failed to load People OS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (currentRole === 'admin') loadInvites();
  }, [workspaceId, currentRole]);

  return {
    loading,
    profiles,
    departments,
    leaves,
    todayAttendance,
    setTodayAttendance,
    isCheckedIn,
    setIsCheckedIn,
    attendanceHistory,
    loadData,
  };
}
