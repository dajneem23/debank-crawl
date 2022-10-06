import { UserRolesWeight, UserRole } from '@/modules';

export const getHighestRole = (roles: string[] = []) => {
  return roles.reduce((prev, curr) => {
    return UserRolesWeight[prev as UserRole] > UserRolesWeight[curr as UserRole] ? prev : curr;
  }, roles[0]);
};

export const getPermission = (roles: string[] = []) => {
  return UserRolesWeight[getHighestRole(roles) as keyof typeof UserRolesWeight] >= UserRolesWeight.admin
    ? 'private'
    : 'public';
};
