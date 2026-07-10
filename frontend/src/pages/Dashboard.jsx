import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DashboardCard from "../components/DashboardCard";

export default function Dashboard() {
  return (
    <div className="dashboard">

      <Sidebar />

      <div className="content">

        <Navbar />

        <div className="cards">

          <DashboardCard
            title="Revenue"
            value="₹52,000"
          />

          <DashboardCard
            title="Transactions"
            value="230"
          />

          <DashboardCard
            title="Clients"
            value="18"
          />

          <DashboardCard
            title="Databases"
            value="5"
          />

        </div>

      </div>

    </div>
  );
}