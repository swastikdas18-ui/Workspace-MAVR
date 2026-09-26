export function filterProfiles(
  profiles: any[],
  searchQuery: string,
  selectedDepartmentFilter: string,
  selectedEmploymentTypeFilter: string,
  departments: any[]
) {
  return profiles.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const selectedDept = departments.find((d) => d.id === selectedDepartmentFilter);
    const matchesDept =
      !selectedDepartmentFilter ||
      p.departmentId === selectedDepartmentFilter ||
      p.department?.id === selectedDepartmentFilter ||
      (selectedDept && (
        (p.department?.name && p.department.name.toLowerCase() === selectedDept.name?.toLowerCase()) ||
        selectedDept.headId === p.userId ||
        selectedDept.head?.id === p.userId ||
        selectedDept.head?.id === p.user?.id ||
        selectedDept.headId === p.user?.id
      ));

    const matchesType = !selectedEmploymentTypeFilter || p.employmentType === selectedEmploymentTypeFilter;
    return matchesSearch && matchesDept && matchesType;
  });
}
