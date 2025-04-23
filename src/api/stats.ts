export interface UserCounts {
    studentCount: number;
    teacherCount: number;
    parentCount: number;
    activeStudentCount: number;
}

export interface TaskStats {
    pendingVerificationCount: number;
}

export const fetchUserCounts = async (): Promise<UserCounts> => {
    console.log(`[API] Fetching User Counts`);
    const response = await fetch('/api/stats/user-counts');
    if (!response.ok) {
        throw new Error(`Failed to fetch user counts: ${response.statusText}`);
    }
    const data: UserCounts = await response.json();
    console.log(`[API] Received user counts:`, data);
    return data;
};

export const fetchPendingTaskCount = async (): Promise<TaskStats> => {
    console.log(`[API] Fetching Task Stats`);
    const response = await fetch('/api/assigned-tasks/stats');
     if (!response.ok) {
        throw new Error(`Failed to fetch task stats: ${response.statusText}`);
    }
    const data: TaskStats = await response.json();
    console.log(`[API] Received task stats:`, data);
    return data;
};