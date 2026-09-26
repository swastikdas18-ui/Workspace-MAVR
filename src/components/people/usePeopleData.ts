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
      const [dirRes, deptRes, leaveRes, attTodayRes, attHistRes] = await Promise.all([
        api.getEmployeeDirectory(),
        api.getDepartments(),
        api.getLeaveRequests(),
        api.getTodayAttendance(),
        api.getAttendanceHistory(),
      ]);

      if (dirRes?.profiles) setProfiles(dirRes.profiles);
      if (deptRes?.departments) setDepartments(deptRes.departments);
      if (leaveRes?.leaves) setLeaves(leaveRes.leaves);
      if (attTodayRes) {
        setTodayAttendance(attTodayRes.record);
        setIsCheckedIn(attTodayRes.isCheckedIn);
      }
      if (attHistRes?.history) setAttendanceHistory(attHistRes.history);
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
