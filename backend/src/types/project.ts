export interface CreateProjectDTO {
  title: string;
  description?: string;
  status?: string;
  dueDate: string;
  startDate?: string;
  budget?: string;
  tags?: string[];
}

export interface UpdateProjectDTO {
  title?: string;
  description?: string;
  status?: string;
  dueDate?: string;
  startDate?: string;
  budget?: string;
  tags?: string[];
  progress?: number;
}
