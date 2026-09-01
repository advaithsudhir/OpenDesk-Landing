import { logout } from "./actions";
import styles from "../auth.module.css";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button className={styles.logoutBtn} type="submit">
        Log out
      </button>
    </form>
  );
}
