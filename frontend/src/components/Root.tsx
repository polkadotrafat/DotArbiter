import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";

export function Root() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
