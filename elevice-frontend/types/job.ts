// Database Job interface matching Supabase schema
export interface Job {
  id: string;
  name: string;
  description?: string;
  position?: string;
  created: string;
  updated: string;
  user_id?: string;
}

// Frontend Job interface for display
export interface JobDisplay {
  id: string;
  title: string;
  position: JobPosition;
  description?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export type JobPosition = 
  | "software-engineer"
  | "frontend-developer"
  | "backend-developer"
  | "fullstack-developer"
  | "mobile-developer"
  | "devops-engineer"
  | "data-scientist"
  | "data-engineer"
  | "product-manager"
  | "ui-ux-designer"
  | "qa-engineer"
  | "security-engineer"
  | "machine-learning-engineer"
  | "cloud-architect"
  | "technical-lead"
  | "engineering-manager";

export interface CreateJobRequest {
  name: string;
  position?: string;
  description?: string;
}

export interface UpdateJobRequest {
  name?: string;
  position?: string;
  description?: string;
}

export interface JobListItem {
  id: string;
  title: string;
  position: JobPosition;
  createdAt: string;
  isActive: boolean;
}


