import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { EmployeesManager } from "@/components/EmployeesManager";
import { useEmployees } from "@/hooks/useEmployees";

const Employees = () => {
  // Include inactive employees in the management view.
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees(true);

  if (loading && employees.length === 0) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Employees"
        description="Manage your team and their time-keeping details"
      />
      <EmployeesManager
        employees={employees}
        onAdd={addEmployee}
        onUpdate={updateEmployee}
        onDelete={deleteEmployee}
      />
    </PageContainer>
  );
};

export default Employees;
