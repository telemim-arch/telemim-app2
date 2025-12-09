
import { supabase } from '../lib/supabase';
import {
    User, Resident, MoveRequest, Helper, AttendanceRecord,
    FinancialRecord, DailyOperationalRecord, Notification, LogEntry, FinancialSettings,
    MoveStatus, UserRole, AssignmentStatus
} from '../types';

// Helper to map DB columns (snake_case) to App types (camelCase)
const mapUser = (u: any): User => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    status: u.status,
    phone: u.phone,
    admissionDate: u.admission_date,
    // avatar: u.avatar_url // Optional, if added
    password: u.password // Legacy auth
});

const mapResident = (r: any): Resident => ({
    id: r.id,
    name: r.name,
    seal: r.seal,
    phone: r.phone,
    originStreet: r.origin_street,
    originNumber: r.origin_number,
    originNeighborhood: r.origin_neighborhood,
    originCity: r.origin_city,
    destinationStreet: r.destination_street,
    destinationNumber: r.destination_number,
    destinationNeighborhood: r.destination_neighborhood,
    destinationCity: r.destination_city,
    notes: r.notes,
    totalMoves: r.total_moves,
    lastMoveDate: r.last_move_date,
    createdAt: r.created_at
});

const mapMove = (m: any): MoveRequest => ({
    id: m.id,
    residentId: m.resident_id,
    residentName: m.resident_name || '', // simplified
    originAddress: m.origin_address,
    destinationAddress: m.destination_address,
    date: m.date,
    time: m.time,
    status: m.status as MoveStatus,
    itemsVolume: Number(m.items_volume),
    estimatedCost: Number(m.estimated_cost),
    notes: m.notes,
    createdAt: m.created_at,

    coordinatorId: m.coordinator_id,
    supervisorId: m.supervisor_id,
    driverId: m.driver_id,
    vanId: m.van_id,

    driverConfirmation: m.driver_confirmation as AssignmentStatus,
    vanConfirmation: m.van_confirmation as AssignmentStatus,

    volumeValidationStatus: m.volume_validation_status,
    contestedVolume: m.contested_volume ? Number(m.contested_volume) : undefined,
    contestationNotes: m.contestation_notes
});

const mapHelper = (h: any): Helper => ({
    id: h.id,
    name: h.name,
    pixKey: h.pix_key,
    active: h.active
});

const mapAttendance = (a: any): AttendanceRecord => ({
    id: a.id,
    date: a.date,
    helperId: a.helper_id,
    isPresent: a.is_present,
    recordedByUserId: a.recorded_by,
    recordedByName: a.recorded_by_name
});

const mapFinancial = (f: any): FinancialRecord => ({
    id: f.id,
    type: f.type,
    amount: Number(f.amount),
    description: f.description,
    date: f.date,
    category: f.category,
    status: f.status
});

const mapOperational = (o: any): DailyOperationalRecord => ({
    id: o.id,
    date: o.date,
    supervisorId: o.supervisor_id,
    driverId: o.driver_id,
    totalTrips: o.total_trips,
    totalLunches: o.total_lunches,
    helperNames: o.helper_names || [],
    costTruck: Number(o.cost_truck),
    costHelpers: Number(o.cost_helpers),
    costSupervisor: Number(o.cost_supervisor),
    costLunch: Number(o.cost_lunch),
    totalCost: Number(o.total_cost)
});

const mapNotification = (n: any): Notification => ({
    id: n.id,
    userId: n.user_id,
    title: n.title,
    message: n.message,
    isRead: n.is_read,
    timestamp: n.timestamp,
    type: n.type as any
});

const mapLog = (l: any): LogEntry => ({
    id: l.id,
    timestamp: l.timestamp,
    userId: l.user_id,
    userName: l.user_name,
    action: l.action,
    details: l.details
});

const mapSettings = (s: any): FinancialSettings => ({
    truckFirstTrip: Number(s.truck_first_trip),
    truckAdditionalTrip: Number(s.truck_additional_trip),
    helperBase: Number(s.helper_base),
    helperAdditionalTrip: Number(s.helper_additional_trip),
    supervisorDaily: Number(s.supervisor_daily),
    lunchUnitCost: Number(s.lunch_unit_cost)
});

export const dbService = {
    // --- LOAD ALL ---
    async loadInitialData() {
        console.log('Fetching initial data from Supabase...');
        const [
            users, residents, moves, helpers, attendance,
            financials, operational, notifications, logs, settings
        ] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('residents').select('*'),
            supabase.from('moves').select('*'),
            supabase.from('helpers').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('financial_records').select('*'),
            supabase.from('operational_records').select('*'),
            supabase.from('notifications').select('*'),
            supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(100),
            supabase.from('settings').select('*').single()
        ]);

        return {
            users: (users.data || []).map(mapUser),
            residents: (residents.data || []).map(mapResident),
            moves: (moves.data || []).map(mapMove),
            helpers: (helpers.data || []).map(mapHelper),
            attendance: (attendance.data || []).map(mapAttendance),
            financials: (financials.data || []).map(mapFinancial),
            operational: (operational.data || []).map(mapOperational),
            notifications: (notifications.data || []).map(mapNotification),
            logs: (logs.data || []).map(mapLog),
            settings: settings.data ? mapSettings(settings.data) : null
        };
    },

    // --- GENERIC CRUD wrappers (simplified for the app's needs) ---

    // USERS
    async createUser(user: Partial<User>) {
        const { data, error } = await supabase.from('users').insert({
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            phone: user.phone,
            admission_date: user.admissionDate,
            password: user.password
        }).select().single();
        if (error) throw error;
        return mapUser(data);
    },
    async updateUser(user: User) {
        const { data, error } = await supabase.from('users').update({
            name: user.name,
            role: user.role,
            status: user.status,
            phone: user.phone,
            admission_date: user.admissionDate
        }).eq('id', user.id).select().single();
        if (error) throw error;
        return mapUser(data);
    },

    // MOVES
    async createMove(move: MoveRequest) {
        const dbMove = {
            resident_id: move.residentId,
            resident_name: move.residentName,
            origin_address: move.originAddress,
            destination_address: move.destinationAddress,
            date: move.date,
            time: move.time,
            status: move.status,
            items_volume: move.itemsVolume,
            estimated_cost: move.estimatedCost,
            notes: move.notes,
            coordinator_id: move.coordinatorId,
            supervisor_id: move.supervisorId,
            driver_id: move.driverId,
            van_id: move.vanId
        };
        const { data, error } = await supabase.from('moves').insert(dbMove).select().single();
        if (error) throw error;
        return mapMove(data);
    },
    async updateMove(move: MoveRequest) {
        const dbMove = {
            resident_id: move.residentId,
            resident_name: move.residentName,
            origin_address: move.originAddress,
            destination_address: move.destinationAddress,
            date: move.date,
            time: move.time,
            status: move.status,
            items_volume: move.itemsVolume,
            estimated_cost: move.estimatedCost,
            notes: move.notes,
            coordinator_id: move.coordinatorId,
            supervisor_id: move.supervisorId,
            driver_id: move.driverId,
            van_id: move.vanId,
            driver_confirmation: move.driverConfirmation,
            van_confirmation: move.vanConfirmation,
            volume_validation_status: move.volumeValidationStatus,
            contested_volume: move.contestedVolume,
            contestation_notes: move.contestationNotes
        };
        const { error } = await supabase.from('moves').update(dbMove).eq('id', move.id);
        if (error) throw error;
    },

    // LOGS
    async createLog(log: Omit<LogEntry, 'id'>) {
        await supabase.from('logs').insert({
            user_id: log.userId,
            user_name: log.userName,
            action: log.action,
            details: log.details,
            timestamp: new Date().toISOString()
        });
    },

    // RESIDENTS
    async createResident(res: Resident) {
        const { data, error } = await supabase.from('residents').insert({
            name: res.name,
            seal: res.seal,
            phone: res.phone,
            origin_street: res.originStreet,
            origin_number: res.originNumber,
            origin_neighborhood: res.originNeighborhood,
            origin_city: res.originCity,
            destination_street: res.destinationStreet,
            destination_number: res.destinationNumber,
            destination_neighborhood: res.destinationNeighborhood,
            destination_city: res.destinationCity,
            notes: res.notes,
            total_moves: res.totalMoves,
            last_move_date: res.lastMoveDate
        }).select().single();
        if (error) throw error;
        return mapResident(data);
    },
    async updateResident(res: Resident) {
        const { error } = await supabase.from('residents').update({
            name: res.name,
            seal: res.seal,
            phone: res.phone,
            origin_street: res.originStreet,
            origin_number: res.originNumber,
            origin_neighborhood: res.originNeighborhood,
            origin_city: res.originCity,
            destination_street: res.destinationStreet,
            destination_number: res.destinationNumber,
            destination_neighborhood: res.destinationNeighborhood,
            destination_city: res.destinationCity,
            notes: res.notes,
            total_moves: res.totalMoves,
            last_move_date: res.lastMoveDate
        }).eq('id', res.id);
        if (error) throw error;
    },
    async deleteResident(id: string) {
        const { error } = await supabase.from('residents').delete().eq('id', id);
        if (error) throw error;
    },

    // HELPERS
    async createHelper(h: Helper) {
        const { data, error } = await supabase.from('helpers').insert({
            name: h.name,
            pix_key: h.pixKey,
            active: h.active
        }).select().single();
        if (error) throw error;
        return mapHelper(data);
    },
    async updateHelper(h: Helper) {
        await supabase.from('helpers').update({
            name: h.name, pix_key: h.pixKey, active: h.active
        }).eq('id', h.id);
    },
    async deleteHelper(id: string) {
        await supabase.from('helpers').delete().eq('id', id);
    },

    // ATTENDANCE
    async updateAttendance(att: AttendanceRecord) {
        // Upsert based on date+helperId (unique constraint)
        // First, check if there's an ID, or query by unique key
        const { data, error } = await supabase.from('attendance').upsert({
            // We might not have ID if it's new, but we have date+helper_id
            date: att.date,
            helper_id: att.helperId,
            is_present: att.isPresent,
            recorded_by: att.recordedByUserId,
            recorded_by_name: att.recordedByName
        }, { onConflict: 'date,helper_id' }).select().single();
        if (error) throw error;
        return mapAttendance(data);
    },

    // FINANCIALS
    async createFinancial(f: FinancialRecord) {
        const { data, error } = await supabase.from('financial_records').insert({
            type: f.type,
            amount: f.amount,
            description: f.description,
            date: f.date,
            category: f.category,
            status: f.status
        }).select().single();
        if (error) throw error;
        return mapFinancial(data);
    },

    // OPERATIONAL
    async createOperational(op: DailyOperationalRecord) {
        const { data, error } = await supabase.from('operational_records').insert({
            date: op.date,
            supervisor_id: op.supervisorId,
            driver_id: op.driverId,
            total_trips: op.totalTrips,
            total_lunches: op.totalLunches,
            helper_names: op.helperNames,
            cost_truck: op.costTruck,
            cost_helpers: op.costHelpers,
            cost_supervisor: op.costSupervisor,
            cost_lunch: op.costLunch,
            total_cost: op.totalCost
        }).select().single();
        if (error) throw error;
        return mapOperational(data);
    },

    // SETTINGS
    async updateSettings(s: FinancialSettings) {
        await supabase.from('settings').update({
            truck_first_trip: s.truckFirstTrip,
            truck_additional_trip: s.truckAdditionalTrip,
            helper_base: s.helperBase,
            helper_additional_trip: s.helperAdditionalTrip,
            supervisor_daily: s.supervisorDaily,
            lunch_unit_cost: s.lunchUnitCost
        }).eq('id', 1);
    },

    // NOTIFICATIONS
    async createNotification(n: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) {
        const { data, error } = await supabase.from('notifications').insert({
            user_id: n.userId,
            title: n.title,
            message: n.message,
            type: n.type
        }).select().single();
        return data ? mapNotification(data) : null;
    },
    async markNotificationRead(id: string) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    },
    async markAllNotificationsRead(userId: string) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    }
};
