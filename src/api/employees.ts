import { supabase } from '../lib/supabase'
import type { Employee, Service, Role } from '../types'

export interface EmployeeWithRelations extends Employee {
  team?: { id: string; name: string } | null
  services?: Service[]
  roles?: Role[]
}

export async function getEmployees(): Promise<EmployeeWithRelations[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      team:teams(id, name),
      services:employee_services(service:services(*)),
      roles:employee_roles(role:roles(*))
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((e) => ({
    ...e,
    services: e.services?.map((s: { service: Service }) => s.service).filter(Boolean) ?? [],
    roles: e.roles?.map((r: { role: Role }) => r.role).filter(Boolean) ?? [],
  })) as EmployeeWithRelations[]
}

export async function createEmployee(emp: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert(emp)
    .select()
    .single()
  if (error) throw error
  return data as Employee
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Employee
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw error
}

export async function assignServiceToEmployee(employeeId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_services')
    .insert({ employee_id: employeeId, service_id: serviceId })
  if (error) throw error
}

export async function removeServiceFromEmployee(employeeId: string, serviceId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_services')
    .delete()
    .eq('employee_id', employeeId)
    .eq('service_id', serviceId)
  if (error) throw error
}

export async function assignRoleToEmployee(employeeId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_roles')
    .insert({ employee_id: employeeId, role_id: roleId })
  if (error) throw error
}

export async function removeRoleFromEmployee(employeeId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_roles')
    .delete()
    .eq('employee_id', employeeId)
    .eq('role_id', roleId)
  if (error) throw error
}

export async function getTeams(): Promise<{ id: string; name: string; description: string | null; service_id: string | null }[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, description, service_id')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createTeam(name: string, description?: string, serviceId?: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .insert({ name, description, service_id: serviceId ?? null })
  if (error) throw error
}

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name')
  if (error) throw error
  return data as Role[]
}
