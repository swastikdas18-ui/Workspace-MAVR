import { eq, and, desc, inArray } from 'drizzle-orm';
import { getDb, schema, inMemoryDb } from '../../packages/database/index.js';
import { NotificationService } from '../services/notification-service';

export interface DepartmentEntity {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  headId: string | null;
  head?: { id: string; name: string; email: string } | null;
  parentId: string | null;
  color: string;
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeProfileEntity {
  id: string;
  workspaceId: string;
  userId: string;
  user?: { id: string; name: string; email: string; avatar?: string | null; role: string };
  departmentId: string | null;
  department?: { id: string; name: string; color?: string } | null;
  designation: string;
  managerId: string | null;
  manager?: { id: string; name: string; email: string } | null;
  joiningDate: Date;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'intern' | string;
  skills: string[];
  bio: string | null;
  location: string;
  phone: string | null;
  emergencyContact: string | null;
  status: 'active' | 'on_leave' | 'probation' | 'terminated' | string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestEntity {
  id: string;
  workspaceId: string;
  userId: string;
  user?: { id: string; name: string; email: string };
  leaveType: 'annual' | 'sick' | 'casual' | 'unpaid' | 'maternity_paternity' | string;
  startDate: Date;
  endDate: Date;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  reviewerId: string | null;
  reviewer?: { id: string; name: string; email: string } | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecordEntity {
  id: string;
  workspaceId: string;
  userId: string;
  user?: { id: string; name: string; email: string };
  date: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  workedHours: number; // in minutes
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | string;
  notes: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalEntity {
  id: string;
  workspaceId: string;
  userId: string;
  user?: { id: string; name: string; email: string };
  departmentId: string | null;
  department?: { id: string; name: string } | null;
  title: string;
  description: string | null;
  category: 'individual' | 'team' | 'company' | string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  status: 'on_track' | 'behind' | 'at_risk' | 'completed' | string;
  linkedProjectIds: string[];
  linkedTaskIds: string[];
  startDate: Date;
  dueDate: Date;
  updates?: Array<{ id: string; userId: string; progressValue: number; progressPercent: number; notes: string | null; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceReviewEntity {
  id: string;
  workspaceId: string;
  userId: string;
  user?: { id: string; name: string; email: string; designation?: string };
  reviewerId: string;
  reviewer?: { id: string; name: string; email: string };
  cycle: string;
  status: 'draft' | 'self_review' | 'manager_review' | 'completed' | string;
  selfRatings: Record<string, any>;
  managerRatings: Record<string, any>;
  finalRating: string;
  strengths: string | null;
  growthAreas: string | null;
  finalComments: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PeopleRepository {
  // ===========================================================================
  // 1. DEPARTMENTS
  // ===========================================================================

  static async listDepartments(workspaceId: string): Promise<DepartmentEntity[]> {
    try {
      const db = getDb();
      if (db) {
        const rows = await db
          .select()
          .from(schema.departments)
          .where(eq(schema.departments.workspaceId, workspaceId));

        if (rows.length > 0) {
          const profiles = await db
            .select()
            .from(schema.employeeProfiles)
            .where(eq(schema.employeeProfiles.workspaceId, workspaceId));

          const userRows = await db.select().from(schema.users);
          const userMap = new Map(userRows.map((u) => [u.id, u]));

          return rows.map((d) => {
            const memberCount = profiles.filter((p) => p.departmentId === d.id || (d.headId && p.userId === d.headId)).length;
            const headUser = d.headId ? userMap.get(d.headId) : null;
            return {
              id: d.id,
              workspaceId: d.workspaceId,
              name: d.name,
              description: d.description || null,
              headId: d.headId || null,
              head: headUser ? { id: headUser.id, name: headUser.name, email: headUser.email } : null,
              parentId: d.parentId || null,
              color: d.color || '#7C3AED',
              memberCount,
              createdAt: d.createdAt,
              updatedAt: d.updatedAt,
            };
          });
        } else {
          return [];
        }
      }
    } catch (err: any) {
      console.warn('[PeopleRepository] listDepartments DB error, falling back to memory:', err?.message);
    }

    // In-memory fallback
    const list = Array.from(inMemoryDb.departments.values()).filter((d) => d.workspaceId === workspaceId);
    const profiles = Array.from(inMemoryDb.employeeProfiles.values()).filter((p) => p.workspaceId === workspaceId);
    return list.map((d) => {
      const headUser = d.headId ? inMemoryDb.users.get(d.headId) : null;
      const memberCount = profiles.filter((p) => p.departmentId === d.id || (d.headId && p.userId === d.headId)).length;
      return {
        id: d.id,
        workspaceId: d.workspaceId,
        name: d.name,
        description: d.description || null,
        headId: d.headId || null,
        head: headUser ? { id: headUser.id, name: headUser.name, email: headUser.email } : null,
        parentId: d.parentId || null,
        color: d.color || '#7C3AED',
        memberCount,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
      };
    });
  }

  static async exists(departmentId: string, workspaceId?: string): Promise<boolean> {
    if (!departmentId) return false;
    try {
      const db = getDb();
      if (db) {
        const query = workspaceId
          ? and(eq(schema.departments.id, departmentId), eq(schema.departments.workspaceId, workspaceId))
          : eq(schema.departments.id, departmentId);
        const rows = await db.select({ id: schema.departments.id }).from(schema.departments).where(query).limit(1);
        if (rows.length > 0) return true;
      }
    } catch {}

    const dept = inMemoryDb.departments.get(departmentId);
    if (dept) {
      if (workspaceId && dept.workspaceId !== workspaceId) return false;
      return true;
    }
    return false;
  }

  static async getDepartmentById(workspaceId: string, departmentId: string): Promise<DepartmentEntity | null> {
    try {
      const db = getDb();
      if (db) {
        const [d] = await db
          .select()
          .from(schema.departments)
          .where(and(eq(schema.departments.id, departmentId), eq(schema.departments.workspaceId, workspaceId)));

        if (d) {
          const profiles = await db
            .select()
            .from(schema.employeeProfiles)
            .where(eq(schema.employeeProfiles.workspaceId, workspaceId));

          const headUser = d.headId
            ? (await db.select().from(schema.users).where(eq(schema.users.id, d.headId)).limit(1))[0] || null
            : null;

          const memberCount = profiles.filter((p) => p.departmentId === d.id || (d.headId && p.userId === d.headId)).length;

          return {
            id: d.id,
            workspaceId: d.workspaceId,
            name: d.name,
            description: d.description || null,
            headId: d.headId || null,
            head: headUser ? { id: headUser.id, name: headUser.name, email: headUser.email } : null,
            parentId: d.parentId || null,
            color: d.color || '#7C3AED',
            memberCount,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        }
      }
    } catch (err: any) {
      console.warn('[PeopleRepository] getDepartmentById DB error:', err?.message);
    }

    const list = await this.listDepartments(workspaceId);
    return list.find((d) => d.id === departmentId) || null;
  }

  static async createDepartment(workspaceId: string, data: { name: string; description?: string; headId?: string; parentId?: string; color?: string }): Promise<DepartmentEntity> {
    const id = crypto.randomUUID();
    const now = new Date();
    
    let validHeadId: string | null = null;
    let validWorkspaceId: string = workspaceId;

    const db = getDb();
    if (db) {
      // 1. Verify workspace exists in DB to prevent foreign key error
      try {
        const wsRows = await db.select({ id: schema.workspaces.id }).from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).limit(1);
        if (wsRows.length === 0) {
          // Fallback: check if workspace exists in inMemoryDb or primary owned workspace
          const inMemWs = inMemoryDb.workspaces.get(workspaceId);
          if (inMemWs) {
            // Upsert workspace record into PostgreSQL if missing
            await db.insert(schema.workspaces).values({
              id: inMemWs.id,
              name: inMemWs.name,
              slug: inMemWs.slug || 'workspace-' + inMemWs.id.substring(0, 8),
              ownerId: inMemWs.ownerId,
              plan: inMemWs.plan || 'free',
              createdAt: inMemWs.createdAt ? new Date(inMemWs.createdAt) : now,
              updatedAt: now,
            }).onConflictDoNothing();
          }
        }
      } catch (wsErr) {
        console.warn('[PeopleRepository] Workspace existence check warn:', wsErr);
      }

      // 2. Verify headId user exists in DB to prevent foreign key error
      if (data.headId) {
        try {
          const userRows = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, data.headId)).limit(1);
          if (userRows.length > 0) {
            validHeadId = data.headId;
          }
        } catch {
          validHeadId = null;
        }
      }
    } else {
      validHeadId = data.headId || null;
    }

    const record = {
      id,
      workspaceId: validWorkspaceId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      headId: validHeadId,
      parentId: data.parentId || null,
      color: data.color || '#7C3AED',
      createdAt: now,
      updatedAt: now,
    };
    inMemoryDb.departments.set(id, record);

    console.log('[PeopleRepository] Inserting department payload:', record);

    try {
      if (db) {
        await db.insert(schema.departments).values(record);
      }
    } catch (err: any) {
      console.error('Department insert failed:', err);
      throw err;
    }

    const created = await this.getDepartmentById(workspaceId, id);
    if (!created) {
      return {
        id: record.id,
        workspaceId: record.workspaceId,
        name: record.name,
        description: record.description,
        headId: record.headId,
        head: null,
        parentId: record.parentId,
        color: record.color,
        memberCount: 0,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    }
    return created;
  }

  static async updateDepartment(workspaceId: string, departmentId: string, data: Partial<{ name: string; description: string; headId: string | null; parentId: string | null; color: string }>): Promise<DepartmentEntity | null> {
    const existing = await this.getDepartmentById(workspaceId, departmentId);
    if (!existing) return null;
    const now = new Date();
    const updated = {
      ...inMemoryDb.departments.get(departmentId),
      ...data,
      updatedAt: now,
    };
    inMemoryDb.departments.set(departmentId, updated);

    try {
      const db = getDb();
      if (db) {
        await db.update(schema.departments).set({ ...data, updatedAt: now }).where(and(eq(schema.departments.id, departmentId), eq(schema.departments.workspaceId, workspaceId)));
      }
    } catch (err: any) {
      console.error('[PeopleRepository] updateDepartment DB error:', err);
      throw new Error(`Failed to update department in database: ${err.message}`);
    }

    return await this.getDepartmentById(workspaceId, departmentId);
  }

  static async deleteDepartment(workspaceId: string, departmentId: string): Promise<boolean> {
    inMemoryDb.departments.delete(departmentId);
    try {
      const db = getDb();
      if (db) {
        await db.delete(schema.departments).where(and(eq(schema.departments.id, departmentId), eq(schema.departments.workspaceId, workspaceId)));
      }
    } catch (err: any) {
      console.error('[PeopleRepository] deleteDepartment DB error:', err);
      throw new Error(`Failed to delete department from database: ${err.message}`);
    }
    return true;
  }

  // ===========================================================================
  // 2. EMPLOYEE PROFILES & DIRECTORY
  // ===========================================================================

  static async listProfiles(
    workspaceId: string,
    filters?: { departmentId?: string; search?: string; managerId?: string; status?: string; employmentType?: string }
  ): Promise<EmployeeProfileEntity[]> {
    try {
      const db = getDb();
      if (db) {
        // 1. Fetch real workspace members from database
        const memberRows = await db
          .select({
            member: schema.workspaceMembers,
            user: schema.users,
          })
          .from(schema.workspaceMembers)
          .innerJoin(schema.users, eq(schema.workspaceMembers.userId, schema.users.id))
          .where(eq(schema.workspaceMembers.workspaceId, workspaceId));

        if (memberRows.length > 0) {
          const profileRows = await db
            .select()
            .from(schema.employeeProfiles)
            .where(eq(schema.employeeProfiles.workspaceId, workspaceId));

          const profileMap = new Map(profileRows.map((p) => [p.userId, p]));
          const depts = await this.listDepartments(workspaceId);
          const deptMap = new Map(depts.map((d) => [d.id, d]));
          const now = new Date();

          let results: EmployeeProfileEntity[] = [];

          for (const row of memberRows) {
            const u = row.user;
            const existing = profileMap.get(u.id);

            const dept = existing?.departmentId
              ? deptMap.get(existing.departmentId)
              : Array.from(deptMap.values()).find((d) => d.headId === u.id) || null;

            const effectiveDeptId = existing?.departmentId || (dept ? dept.id : null);

            results.push({
              id: existing?.id || 'prof-' + u.id,
              workspaceId,
              userId: u.id,
              user: {
                id: u.id,
                name: u.name,
                email: u.email,
                avatar: u.avatar || null,
                role: u.role,
              },
              departmentId: effectiveDeptId,
              department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
              designation: existing?.designation || u.title || (u.role === 'admin' ? 'Organization Administrator' : u.role === 'intern' ? 'Engineering Intern' : 'Operations Specialist'),
              managerId: existing?.managerId || null,
              manager: null,
              joiningDate: existing?.joiningDate || (u.createdAt ? new Date(u.createdAt) : now),
              employmentType: existing?.employmentType || (u.role === 'intern' ? 'intern' : 'full_time'),
              skills: Array.isArray(existing?.skills) ? existing.skills : [],
              bio: existing?.bio || null,
              location: existing?.location || 'Remote',
              phone: existing?.phone || null,
              emergencyContact: existing?.emergencyContact || null,
              status: existing?.status || 'active',
              createdAt: existing?.createdAt || u.createdAt || now,
              updatedAt: existing?.updatedAt || now,
            });
          }

          if (filters?.departmentId) {
            const targetDept = deptMap.get(filters.departmentId);
            results = results.filter((p) =>
              p.departmentId === filters.departmentId ||
              p.department?.id === filters.departmentId ||
              (targetDept && targetDept.headId === p.userId)
            );
          }
          if (filters?.managerId) {
            results = results.filter((p) => p.managerId === filters.managerId);
          }
          if (filters?.status) {
            results = results.filter((p) => p.status === filters.status);
          }
          if (filters?.employmentType) {
            results = results.filter((p) => p.employmentType === filters.employmentType);
          }
          if (filters?.search) {
            const q = filters.search.toLowerCase();
            results = results.filter(
              (p) =>
                p.user?.name?.toLowerCase().includes(q) ||
                p.user?.email?.toLowerCase().includes(q) ||
                p.designation?.toLowerCase().includes(q) ||
                p.location?.toLowerCase().includes(q) ||
                p.skills?.some((s) => s.toLowerCase().includes(q))
            );
          }

          return results;
        }
      }
    } catch {
      // Fallback to in-memory
    }

    // 1. In-memory fallback
    const memberRows = Array.from(inMemoryDb.workspaceMembers.values()).filter((wm) => wm.workspaceId === workspaceId);
    const memberUserIds = new Set(memberRows.map((wm) => wm.userId));

    // Ensure all workspace users have at least a default profile
    for (const userId of memberUserIds) {
      const existingProfile = Array.from(inMemoryDb.employeeProfiles.values()).find((p) => p.workspaceId === workspaceId && p.userId === userId);
      if (!existingProfile) {
        const u = inMemoryDb.users.get(userId);
        const profileId = 'prof-' + userId;
        inMemoryDb.employeeProfiles.set(profileId, {
          id: profileId,
          workspaceId,
          userId,
          departmentId: u?.teamId || null,
          designation: u?.title || (u?.role === 'admin' ? 'Executive Director' : u?.role === 'intern' ? 'Engineering Intern' : 'Team Member'),
          managerId: null,
          joiningDate: u?.createdAt ? new Date(u.createdAt) : new Date(),
          employmentType: u?.role === 'intern' ? 'intern' : 'full_time',
          skills: [],
          bio: null,
          location: 'Remote',
          phone: null,
          emergencyContact: null,
          status: 'active',
          createdAt: u?.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const allProfiles = Array.from(inMemoryDb.employeeProfiles.values()).filter((p) => p.workspaceId === workspaceId);
    const depts = await this.listDepartments(workspaceId);
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    let results: EmployeeProfileEntity[] = allProfiles.map((p) => {
      const u = inMemoryDb.users.get(p.userId);
      const managerUser = p.managerId ? inMemoryDb.users.get(p.managerId) : null;
      const dept = p.departmentId 
        ? deptMap.get(p.departmentId) 
        : Array.from(deptMap.values()).find((d) => d.headId === p.userId) || null;
      const effectiveDeptId = p.departmentId || (dept ? dept.id : null);

      return {
        id: p.id,
        workspaceId: p.workspaceId,
        userId: p.userId,
        user: u ? { id: u.id, name: u.name, email: u.email, avatar: u.avatar || null, role: u.role } : undefined,
        departmentId: effectiveDeptId,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
        designation: p.designation || 'Team Member',
        managerId: p.managerId || null,
        manager: managerUser ? { id: managerUser.id, name: managerUser.name, email: managerUser.email } : null,
        joiningDate: p.joiningDate ? new Date(p.joiningDate) : new Date(),
        employmentType: p.employmentType || 'full_time',
        skills: Array.isArray(p.skills) ? p.skills : [],
        bio: p.bio || null,
        location: p.location || 'Remote',
        phone: p.phone || null,
        emergencyContact: p.emergencyContact || null,
        status: p.status || 'active',
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      };
    });

    if (filters?.departmentId) {
      const targetDept = deptMap.get(filters.departmentId);
      results = results.filter((p) => 
        p.departmentId === filters.departmentId || 
        p.department?.id === filters.departmentId ||
        (targetDept && targetDept.headId === p.userId)
      );
    }
    if (filters?.managerId) {
      results = results.filter((p) => p.managerId === filters.managerId);
    }
    if (filters?.status) {
      results = results.filter((p) => p.status === filters.status);
    }
    if (filters?.employmentType) {
      results = results.filter((p) => p.employmentType === filters.employmentType);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          p.user?.name?.toLowerCase().includes(q) ||
          p.user?.email?.toLowerCase().includes(q) ||
          p.designation?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.skills?.some((s) => s.toLowerCase().includes(q))
      );
    }

    return results;
  }

  static async getProfileByUserId(workspaceId: string, userId: string): Promise<EmployeeProfileEntity | null> {
    const list = await this.listProfiles(workspaceId);
    return list.find((p) => p.userId === userId) || null;
  }

  static async upsertProfile(
    workspaceId: string,
    userId: string,
    data: {
      departmentId?: string | null;
      designation?: string;
      managerId?: string | null;
      joiningDate?: Date;
      employmentType?: string;
      skills?: string[];
      bio?: string;
      location?: string;
      phone?: string;
      emergencyContact?: string;
      status?: string;
    }
  ): Promise<EmployeeProfileEntity> {
    const existing = await this.getProfileByUserId(workspaceId, userId);
    const now = new Date();
    const id = existing?.id || 'prof-' + userId;

    const record = {
      id,
      workspaceId,
      userId,
      departmentId: data.departmentId !== undefined ? data.departmentId : existing?.departmentId || null,
      designation: data.designation || existing?.designation || 'Team Member',
      managerId: data.managerId !== undefined ? data.managerId : existing?.managerId || null,
      joiningDate: data.joiningDate || existing?.joiningDate || now,
      employmentType: data.employmentType || existing?.employmentType || 'full_time',
      skills: data.skills || existing?.skills || [],
      bio: data.bio !== undefined ? data.bio : existing?.bio || null,
      location: data.location || existing?.location || 'Remote',
      phone: data.phone !== undefined ? data.phone : existing?.phone || null,
      emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : existing?.emergencyContact || null,
      status: data.status || existing?.status || 'active',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    inMemoryDb.employeeProfiles.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db
          .insert(schema.employeeProfiles)
          .values(record)
          .onConflictDoUpdate({
            target: schema.employeeProfiles.userId,
            set: record,
          });
      }
    } catch {
      // Handled
    }

    return (await this.getProfileByUserId(workspaceId, userId))!;
  }

  // ===========================================================================
  // 3. ORG CHART & HIERARCHY
  // ===========================================================================

  static async getOrgChart(workspaceId: string): Promise<{
    root: any;
    unassigned: any[];
    totalEmployees: number;
    departments: DepartmentEntity[];
  }> {
    const profiles = await this.listProfiles(workspaceId);
    const departments = await this.listDepartments(workspaceId);

    // Identify CEO / Top-level Manager (Admin / User with no manager or owner)
    const ws = inMemoryDb.workspaces.get(workspaceId);
    const ownerId = ws?.ownerId;

    let rootProfile = profiles.find((p) => p.userId === ownerId) || profiles.find((p) => p.managerId === null) || profiles[0];

    // Build children tree recursively
    const buildNode = (profile: EmployeeProfileEntity): any => {
      const directReports = profiles.filter((p) => p.managerId === profile.userId && p.userId !== profile.userId);
      return {
        id: profile.id,
        userId: profile.userId,
        name: profile.user?.name || 'Unknown',
        email: profile.user?.email || '',
        avatar: profile.user?.avatar || null,
        role: profile.user?.role || 'employee',
        designation: profile.designation,
        department: profile.department,
        employmentType: profile.employmentType,
        location: profile.location,
        directReportsCount: directReports.length,
        children: directReports.map((dr) => buildNode(dr)),
      };
    };

    const rootNode = rootProfile ? buildNode(rootProfile) : null;
    const includedUserIds = new Set<string>();

    const traverse = (node: any) => {
      if (!node) return;
      includedUserIds.add(node.userId);
      node.children?.forEach(traverse);
    };
    traverse(rootNode);

    const unassigned = profiles
      .filter((p) => !includedUserIds.has(p.userId))
      .map((p) => ({
        id: p.id,
        userId: p.userId,
        name: p.user?.name || 'Unknown',
        email: p.user?.email || '',
        designation: p.designation,
        department: p.department,
      }));

    return {
      root: rootNode,
      unassigned,
      totalEmployees: profiles.length,
      departments,
    };
  }

  static async reassignManager(workspaceId: string, userId: string, managerId: string | null): Promise<EmployeeProfileEntity> {
    return this.upsertProfile(workspaceId, userId, { managerId });
  }

  static async transferDepartment(workspaceId: string, userId: string, departmentId: string | null): Promise<EmployeeProfileEntity> {
    return this.upsertProfile(workspaceId, userId, { departmentId });
  }

  // ===========================================================================
  // 4. LEAVE MANAGEMENT
  // ===========================================================================

  static async createLeaveRequest(
    workspaceId: string,
    userId: string,
    data: { leaveType: string; startDate: Date; endDate: Date; reason: string; daysCount?: number }
  ): Promise<LeaveRequestEntity> {
    const id = 'leave-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    const daysCount = data.daysCount || calculatedDays;

    const record = {
      id,
      workspaceId,
      userId,
      leaveType: data.leaveType || 'annual',
      startDate: start,
      endDate: end,
      daysCount,
      reason: data.reason.trim(),
      status: 'pending',
      reviewerId: null,
      reviewedAt: null,
      reviewNotes: null,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.leaveRequests.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.leaveRequests).values(record);
      }
    } catch {
      // Handled
    }

    // Notification dispatch handled at service level (PeopleService)

    return (await this.getLeaveRequestById(workspaceId, id))!;
  }

  static async listLeaveRequests(
    workspaceId: string,
    options?: { userId?: string; status?: string; reviewerId?: string }
  ): Promise<LeaveRequestEntity[]> {
    let list = Array.from(inMemoryDb.leaveRequests.values()).filter((l) => l.workspaceId === workspaceId);

    if (options?.userId) {
      list = list.filter((l) => l.userId === options.userId);
    }
    if (options?.status) {
      list = list.filter((l) => l.status === options.status);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list.map((l) => {
      const user = inMemoryDb.users.get(l.userId);
      const reviewer = l.reviewerId ? inMemoryDb.users.get(l.reviewerId) : null;
      return {
        id: l.id,
        workspaceId: l.workspaceId,
        userId: l.userId,
        user: user ? { id: user.id, name: user.name, email: user.email } : undefined,
        leaveType: l.leaveType,
        startDate: new Date(l.startDate),
        endDate: new Date(l.endDate),
        daysCount: l.daysCount || 1,
        reason: l.reason,
        status: l.status,
        reviewerId: l.reviewerId || null,
        reviewer: reviewer ? { id: reviewer.id, name: reviewer.name, email: reviewer.email } : null,
        reviewedAt: l.reviewedAt ? new Date(l.reviewedAt) : null,
        reviewNotes: l.reviewNotes || null,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.updatedAt),
      };
    });
  }

  static async getLeaveRequestById(workspaceId: string, leaveId: string): Promise<LeaveRequestEntity | null> {
    const list = await this.listLeaveRequests(workspaceId);
    return list.find((l) => l.id === leaveId) || null;
  }

  static async reviewLeaveRequest(
    workspaceId: string,
    leaveId: string,
    reviewerId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<LeaveRequestEntity | null> {
    const existing = await this.getLeaveRequestById(workspaceId, leaveId);
    if (!existing) return null;

    const now = new Date();
    const updated = {
      ...inMemoryDb.leaveRequests.get(leaveId),
      status,
      reviewerId,
      reviewedAt: now,
      reviewNotes: reviewNotes || null,
      updatedAt: now,
    };

    inMemoryDb.leaveRequests.set(leaveId, updated);

    try {
      const db = getDb();
      if (db) {
        await db
          .update(schema.leaveRequests)
          .set({ status, reviewerId, reviewedAt: now, reviewNotes: reviewNotes || null, updatedAt: now })
          .where(and(eq(schema.leaveRequests.id, leaveId), eq(schema.leaveRequests.workspaceId, workspaceId)));
      }
    } catch {
      // Handled
    }

    // Notification dispatch handled at service level (PeopleService)

    return await this.getLeaveRequestById(workspaceId, leaveId);
  }

  static async getLeaveBalances(workspaceId: string, userId: string): Promise<{
    annual: { total: number; used: number; remaining: number };
    sick: { total: number; used: number; remaining: number };
    casual: { total: number; used: number; remaining: number };
    pendingCount: number;
  }> {
    const leaves = await this.listLeaveRequests(workspaceId, { userId });
    const approvedLeaves = leaves.filter((l) => l.status === 'approved');
    const pendingLeaves = leaves.filter((l) => l.status === 'pending');

    const usedAnnual = approvedLeaves.filter((l) => l.leaveType === 'annual').reduce((acc, l) => acc + l.daysCount, 0);
    const usedSick = approvedLeaves.filter((l) => l.leaveType === 'sick').reduce((acc, l) => acc + l.daysCount, 0);
    const usedCasual = approvedLeaves.filter((l) => l.leaveType === 'casual').reduce((acc, l) => acc + l.daysCount, 0);

    return {
      annual: { total: 20, used: usedAnnual, remaining: Math.max(0, 20 - usedAnnual) },
      sick: { total: 10, used: usedSick, remaining: Math.max(0, 10 - usedSick) },
      casual: { total: 5, used: usedCasual, remaining: Math.max(0, 5 - usedCasual) },
      pendingCount: pendingLeaves.length,
    };
  }

  // ===========================================================================
  // 5. ATTENDANCE SYSTEM
  // ===========================================================================

  static async checkIn(workspaceId: string, userId: string, ipAddress?: string, notes?: string): Promise<AttendanceRecordEntity> {
    const today = new Date().toISOString().split('T')[0];
    const existing = Array.from(inMemoryDb.attendanceRecords.values()).find(
      (a) => a.workspaceId === workspaceId && a.userId === userId && a.date === today
    );

    const now = new Date();
    const isLate = now.getHours() >= 10 && now.getMinutes() > 0; // Late after 10:00 AM
    const status = isLate ? 'late' : 'present';

    if (existing) {
      existing.checkInAt = now;
      existing.status = status;
      existing.updatedAt = now;
      inMemoryDb.attendanceRecords.set(existing.id, existing);
      return existing;
    }

    const id = 'att-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const record: AttendanceRecordEntity = {
      id,
      workspaceId,
      userId,
      date: today,
      checkInAt: now,
      checkOutAt: null,
      workedHours: 0,
      status,
      notes: notes || null,
      ipAddress: ipAddress || '127.0.0.1',
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.attendanceRecords.set(id, record);
    return record;
  }

  static async checkOut(workspaceId: string, userId: string, notes?: string): Promise<AttendanceRecordEntity | null> {
    const today = new Date().toISOString().split('T')[0];
    const existing = Array.from(inMemoryDb.attendanceRecords.values()).find(
      (a) => a.workspaceId === workspaceId && a.userId === userId && a.date === today
    );

    const now = new Date();
    if (!existing) {
      // Created record on checkout if missed check in
      return this.checkIn(workspaceId, userId, undefined, notes);
    }

    existing.checkOutAt = now;
    if (existing.checkInAt) {
      const diffMs = now.getTime() - new Date(existing.checkInAt).getTime();
      existing.workedHours = Math.round(diffMs / (1000 * 60)); // minutes
    }
    existing.updatedAt = now;
    if (notes) existing.notes = notes;

    inMemoryDb.attendanceRecords.set(existing.id, existing);
    return existing;
  }

  static async getTodayAttendance(workspaceId: string, userId?: string): Promise<AttendanceRecordEntity | null> {
    const today = new Date().toISOString().split('T')[0];
    if (userId) {
      const rec = Array.from(inMemoryDb.attendanceRecords.values()).find(
        (a) => a.workspaceId === workspaceId && a.userId === userId && a.date === today
      );
      return rec || null;
    }
    return null;
  }

  static async listAttendanceHistory(
    workspaceId: string,
    options?: { userId?: string; startDate?: string; endDate?: string; limit?: number }
  ): Promise<AttendanceRecordEntity[]> {
    let list = Array.from(inMemoryDb.attendanceRecords.values()).filter((a) => a.workspaceId === workspaceId);

    if (options?.userId) {
      list = list.filter((a) => a.userId === options.userId);
    }
    if (options?.startDate) {
      list = list.filter((a) => a.date >= options.startDate!);
    }
    if (options?.endDate) {
      list = list.filter((a) => a.date <= options.endDate!);
    }

    list.sort((a, b) => b.date.localeCompare(a.date));

    return list.slice(0, options?.limit || 100).map((a) => {
      const user = inMemoryDb.users.get(a.userId);
      return {
        ...a,
        user: user ? { id: user.id, name: user.name, email: user.email } : undefined,
      };
    });
  }

  static async getAttendanceMetrics(workspaceId: string): Promise<{
    presentToday: number;
    absentToday: number;
    lateToday: number;
    onLeaveToday: number;
    attendanceRate: number;
    totalStaff: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const profiles = await this.listProfiles(workspaceId);
    const totalStaff = profiles.length;

    const todayRecords = Array.from(inMemoryDb.attendanceRecords.values()).filter(
      (a) => a.workspaceId === workspaceId && a.date === today
    );

    const presentToday = todayRecords.filter((a) => a.status === 'present' || a.status === 'late').length;
    const lateToday = todayRecords.filter((a) => a.status === 'late').length;
    const onLeaveToday = profiles.filter((p) => p.status === 'on_leave').length;
    const absentToday = Math.max(0, totalStaff - presentToday - onLeaveToday);
    const attendanceRate = totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 100;

    return {
      presentToday,
      absentToday,
      lateToday,
      onLeaveToday,
      attendanceRate,
      totalStaff,
    };
  }

  // ===========================================================================
  // 6. EMPLOYEE GOALS & OKRs
  // ===========================================================================

  static async createGoal(
    workspaceId: string,
    userId: string,
    data: {
      title: string;
      description?: string;
      category?: string;
      departmentId?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      progress?: number;
      dueDate: Date;
      linkedProjectIds?: string[];
      linkedTaskIds?: string[];
    }
  ): Promise<GoalEntity> {
    const id = 'goal-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const target = data.targetValue || 100;
    const current = data.currentValue || 0;
    const progress = data.progress !== undefined ? data.progress : Math.min(100, Math.round((current / target) * 100));

    let status = 'on_track';
    if (progress >= 100) status = 'completed';
    else if (progress < 40) status = 'behind';

    const record = {
      id,
      workspaceId,
      userId,
      departmentId: data.departmentId || null,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      category: data.category || 'individual',
      targetValue: target,
      currentValue: current,
      unit: data.unit || '%',
      progress,
      status,
      linkedProjectIds: data.linkedProjectIds || [],
      linkedTaskIds: data.linkedTaskIds || [],
      startDate: now,
      dueDate: new Date(data.dueDate),
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.goals.set(id, record);

    try {
      const db = getDb();
      if (db) {
        await db.insert(schema.goals).values(record);
      }
    } catch {
      // Handled
    }

    return (await this.getGoalById(workspaceId, id))!;
  }

  static async listGoals(
    workspaceId: string,
    options?: { userId?: string; departmentId?: string; category?: string; status?: string }
  ): Promise<GoalEntity[]> {
    let list = Array.from(inMemoryDb.goals.values()).filter((g) => g.workspaceId === workspaceId);

    if (options?.userId) list = list.filter((g) => g.userId === options.userId);
    if (options?.departmentId) list = list.filter((g) => g.departmentId === options.departmentId);
    if (options?.category) list = list.filter((g) => g.category === options.category);
    if (options?.status) list = list.filter((g) => g.status === options.status);

    const depts = await this.listDepartments(workspaceId);
    const deptMap = new Map(depts.map((d) => [d.id, d]));

    return list.map((g) => {
      const user = inMemoryDb.users.get(g.userId);
      const dept = g.departmentId ? deptMap.get(g.departmentId) : null;
      const updates = Array.from(inMemoryDb.goalUpdates.values())
        .filter((gu) => gu.goalId === g.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        id: g.id,
        workspaceId: g.workspaceId,
        userId: g.userId,
        user: user ? { id: user.id, name: user.name, email: user.email } : undefined,
        departmentId: g.departmentId || null,
        department: dept ? { id: dept.id, name: dept.name } : null,
        title: g.title,
        description: g.description || null,
        category: g.category,
        targetValue: g.targetValue || 100,
        currentValue: g.currentValue || 0,
        unit: g.unit || '%',
        progress: g.progress || 0,
        status: g.status || 'on_track',
        linkedProjectIds: g.linkedProjectIds || [],
        linkedTaskIds: g.linkedTaskIds || [],
        startDate: new Date(g.startDate),
        dueDate: new Date(g.dueDate),
        updates,
        createdAt: new Date(g.createdAt),
        updatedAt: new Date(g.updatedAt),
      };
    });
  }

  static async getGoalById(workspaceId: string, goalId: string): Promise<GoalEntity | null> {
    const list = await this.listGoals(workspaceId);
    return list.find((g) => g.id === goalId) || null;
  }

  static async updateGoal(
    workspaceId: string,
    goalId: string,
    data: Partial<{
      title: string;
      description: string;
      category: string;
      targetValue: number;
      currentValue: number;
      unit: string;
      progress: number;
      status: string;
      dueDate: Date;
    }>
  ): Promise<GoalEntity | null> {
    const existing = await this.getGoalById(workspaceId, goalId);
    if (!existing) return null;

    const now = new Date();
    const updated = {
      ...inMemoryDb.goals.get(goalId),
      ...data,
      updatedAt: now,
    };
    inMemoryDb.goals.set(goalId, updated);
    return await this.getGoalById(workspaceId, goalId);
  }

  static async addGoalUpdate(
    workspaceId: string,
    goalId: string,
    userId: string,
    progressValue: number,
    progressPercent: number,
    notes?: string
  ): Promise<GoalEntity | null> {
    const goal = await this.getGoalById(workspaceId, goalId);
    if (!goal) return null;

    const updateId = 'gu-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();
    const updateRecord = {
      id: updateId,
      goalId,
      userId,
      progressValue,
      progressPercent,
      notes: notes || null,
      createdAt: now,
    };

    inMemoryDb.goalUpdates.set(updateId, updateRecord);

    let status = goal.status;
    if (progressPercent >= 100) status = 'completed';
    else if (progressPercent >= 70) status = 'on_track';
    else if (progressPercent < 40) status = 'behind';

    await this.updateGoal(workspaceId, goalId, {
      currentValue: progressValue,
      progress: progressPercent,
      status,
    });

    return await this.getGoalById(workspaceId, goalId);
  }

  static async deleteGoal(workspaceId: string, goalId: string): Promise<boolean> {
    inMemoryDb.goals.delete(goalId);
    return true;
  }

  // ===========================================================================
  // 7. PERFORMANCE REVIEWS
  // ===========================================================================

  static async createReview(
    workspaceId: string,
    data: { userId: string; reviewerId: string; cycle: string }
  ): Promise<PerformanceReviewEntity> {
    const id = 'rev-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    const record = {
      id,
      workspaceId,
      userId: data.userId,
      reviewerId: data.reviewerId,
      cycle: data.cycle || 'Q1 2026',
      status: 'self_review',
      selfRatings: {
        communication: 4,
        ownership: 4,
        execution: 4,
        leadership: 3,
        comments: '',
      },
      managerRatings: {
        communication: 0,
        ownership: 0,
        execution: 0,
        leadership: 0,
        comments: '',
      },
      finalRating: '4.0',
      strengths: null,
      growthAreas: null,
      finalComments: null,
      submittedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    inMemoryDb.performanceReviews.set(id, record);
    return (await this.getReviewById(workspaceId, id))!;
  }

  static async listReviews(
    workspaceId: string,
    options?: { userId?: string; reviewerId?: string; cycle?: string; status?: string }
  ): Promise<PerformanceReviewEntity[]> {
    let list = Array.from(inMemoryDb.performanceReviews.values()).filter((r) => r.workspaceId === workspaceId);

    if (options?.userId) list = list.filter((r) => r.userId === options.userId);
    if (options?.reviewerId) list = list.filter((r) => r.reviewerId === options.reviewerId);
    if (options?.cycle) list = list.filter((r) => r.cycle === options.cycle);
    if (options?.status) list = list.filter((r) => r.status === options.status);

    const profiles = await this.listProfiles(workspaceId);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    return list.map((r) => {
      const user = inMemoryDb.users.get(r.userId);
      const reviewer = inMemoryDb.users.get(r.reviewerId);
      const prof = profileMap.get(r.userId);

      return {
        id: r.id,
        workspaceId: r.workspaceId,
        userId: r.userId,
        user: user ? { id: user.id, name: user.name, email: user.email, designation: prof?.designation } : undefined,
        reviewerId: r.reviewerId,
        reviewer: reviewer ? { id: reviewer.id, name: reviewer.name, email: reviewer.email } : undefined,
        cycle: r.cycle,
        status: r.status,
        selfRatings: r.selfRatings || {},
        managerRatings: r.managerRatings || {},
        finalRating: r.finalRating || '4.0',
        strengths: r.strengths || null,
        growthAreas: r.growthAreas || null,
        finalComments: r.finalComments || null,
        submittedAt: r.submittedAt ? new Date(r.submittedAt) : null,
        completedAt: r.completedAt ? new Date(r.completedAt) : null,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      };
    });
  }

  static async getReviewById(workspaceId: string, reviewId: string): Promise<PerformanceReviewEntity | null> {
    const list = await this.listReviews(workspaceId);
    return list.find((r) => r.id === reviewId) || null;
  }

  static async submitSelfReview(
    workspaceId: string,
    reviewId: string,
    userId: string,
    selfRatings: Record<string, any>,
    comments?: string
  ): Promise<PerformanceReviewEntity | null> {
    const review = await this.getReviewById(workspaceId, reviewId);
    if (!review) return null;

    const now = new Date();
    const updated = {
      ...inMemoryDb.performanceReviews.get(reviewId),
      selfRatings: { ...selfRatings, comments: comments || selfRatings.comments || '' },
      status: 'manager_review',
      submittedAt: now,
      updatedAt: now,
    };

    inMemoryDb.performanceReviews.set(reviewId, updated);
    return await this.getReviewById(workspaceId, reviewId);
  }

  static async submitManagerReview(
    workspaceId: string,
    reviewId: string,
    reviewerId: string,
    managerRatings: Record<string, any>,
    comments?: string,
    strengths?: string,
    growthAreas?: string
  ): Promise<PerformanceReviewEntity | null> {
    const review = await this.getReviewById(workspaceId, reviewId);
    if (!review) return null;

    const scores = [
      Number(managerRatings.communication) || 4,
      Number(managerRatings.ownership) || 4,
      Number(managerRatings.execution) || 4,
      Number(managerRatings.leadership) || 4,
    ];
    const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);

    const now = new Date();
    const updated = {
      ...inMemoryDb.performanceReviews.get(reviewId),
      managerRatings: { ...managerRatings, comments: comments || managerRatings.comments || '' },
      finalRating: avgScore,
      strengths: strengths || null,
      growthAreas: growthAreas || null,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
    };

    inMemoryDb.performanceReviews.set(reviewId, updated);
    return await this.getReviewById(workspaceId, reviewId);
  }

  // ===========================================================================
  // 8. EXECUTIVE PEOPLE ANALYTICS & TELEMETRY
  // ===========================================================================

  static async getPeopleAnalytics(workspaceId: string): Promise<{
    workforce: {
      totalEmployees: number;
      departmentsCount: number;
      managersCount: number;
      internsCount: number;
      fullTimeCount: number;
    };
    attendance: {
      presentToday: number;
      absentToday: number;
      lateToday: number;
      onLeaveToday: number;
      attendanceRate: number;
    };
    hiring: {
      openPositions: number;
      newJoineesCount: number;
    };
    performance: {
      averageGoalProgress: number;
      topPerformers: Array<{ userId: string; name: string; designation: string; rating: string; goalProgress: number }>;
      atRiskCount: number;
    };
  }> {
    const profiles = await this.listProfiles(workspaceId);
    const departments = await this.listDepartments(workspaceId);
    const attendance = await this.getAttendanceMetrics(workspaceId);
    const goals = await this.listGoals(workspaceId);
    const reviews = await this.listReviews(workspaceId);

    const totalEmployees = profiles.length;
    const managersCount = new Set(profiles.map((p) => p.managerId).filter(Boolean)).size;
    const internsCount = profiles.filter((p) => p.employmentType === 'intern' || p.user?.role === 'intern').length;
    const fullTimeCount = profiles.filter((p) => p.employmentType === 'full_time').length;

    const avgGoalProgress = goals.length > 0 ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length) : 0;
    const atRiskCount = goals.filter((g) => g.status === 'at_risk' || g.status === 'behind').length;

    // Top Performers calculation
    const topPerformers = profiles.slice(0, 4).map((p) => {
      const userGoals = goals.filter((g) => g.userId === p.userId);
      const userReviews = reviews.filter((r) => r.userId === p.userId && r.status === 'completed');
      const userProgress = userGoals.length > 0 ? Math.round(userGoals.reduce((a, g) => a + g.progress, 0) / userGoals.length) : 0;
      const rating = userReviews[0]?.finalRating || '5.0';

      return {
        userId: p.userId,
        name: p.user?.name || 'Top Contributor',
        designation: p.designation,
        rating,
        goalProgress: userProgress,
      };
    });

    return {
      workforce: {
        totalEmployees,
        departmentsCount: departments.length,
        managersCount,
        internsCount,
        fullTimeCount,
      },
      attendance: {
        presentToday: attendance.presentToday,
        absentToday: attendance.absentToday,
        lateToday: attendance.lateToday,
        onLeaveToday: attendance.onLeaveToday,
        attendanceRate: attendance.attendanceRate,
      },
      hiring: {
        openPositions: 0,
        newJoineesCount: profiles.filter((p) => new Date(p.joiningDate).getFullYear() === 2026).length,
      },
      performance: {
        averageGoalProgress: avgGoalProgress,
        topPerformers,
        atRiskCount,
      },
    };
  }
}

export const departmentRepository = {
  exists: (departmentId: string, workspaceId?: string) => PeopleRepository.exists(departmentId, workspaceId),
};
