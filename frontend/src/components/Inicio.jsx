import { useEffect, useState, useContext } from "react";
import StatsCard from "./StatsCard";
import HomeDateFilter from "./HomeDateFilter";
import Dashboard from "../shared/Dashboard";
import { getStatsResume as getStatsResumeService } from "../services/RegistrosService";
import { HomeFilterProvider, HomeFilterContext } from "../context/HomeFilterContext";
//import { AuthContext } from "../context/AuthContext";
import SkeletonGrid from "../shared/SkeletonGrid";

const styles = {
  display: "flex",
  flexWrap: "wrap",
  gap: "30px",
  marginTop: "20px",
};

function ResumenCards() {
  const { range } = useContext(HomeFilterContext);
  const [statsResume, setStatsResume] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await getStatsResumeService(range);
        if (!cancelled && resp.status === 200) setStatsResume(resp.data);
      } catch (error) {
        console.error("Failed to fetch stats resume:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (!statsResume) return <SkeletonGrid />;

  return (
    <section style={styles}>
      {Object.entries(statsResume).map(([key, value]) => (
        <StatsCard key={key} title={key} value={value} />
      ))}
    </section>
  );
}

function Inicio() {
  //const { userInfo } = useContext(AuthContext);

  return (
    <div style={{ padding: "20px" }}>
      <h1>
        {/* saludar dependiendo la hora del día */}
        {(() => {
          const hour = new Date().getHours();
          if (hour < 12) return "Buenos días ☀️";
          if (hour < 18) return "Buenas tardes 🌤️";
          return "Buenas noches 🌙";
        })()}{" "}
        tu resumen financiero.</h1>

      <HomeFilterProvider>
        <HomeDateFilter />
        <ResumenCards />
        <Dashboard />
      </HomeFilterProvider>
    </div>
  );
}

export default Inicio;
