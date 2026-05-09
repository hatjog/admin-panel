import "@mercurjs/admin/index.css"
import React from "react"
import ReactDOM from "react-dom/client"

import MercurAdminApp from "@mercurjs/admin"

import "./admin-extension-skeleton.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MercurAdminApp />
  </React.StrictMode>,
)
