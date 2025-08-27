/* ===== Entry point ===== */
import { buildLogisticMap } from "./map.js";

import { renderTop, renderDashboardViews, renderLeaders, renderWallet } from "./dashboard.js";
import { startWeighFlow, finishOrder, startWeighFromPick, bindWeighButtons } from "./weigh.js";
import { autoAssignOrder, bindSidebar, bindTabs, bindActiveToggle, bindKeyboard, goView } from "./ui.js";
import { state } from "./state.js";
import { $ } from "./helpers.js";

function init(){
  renderTop(state.pickerIsActive);

  // Render ONLY the logistics-center map
  buildLogisticMap();

  renderDashboardViews();
  renderLeaders();
  renderWallet();
  goView("#view-dashboard");

  bindSidebar();
  bindTabs();
  bindActiveToggle(autoAssignOrder);
  bindKeyboard(startWeighFlow, finishOrder);
  bindWeighButtons();

  $("#btnQuickStart").onclick = ()=>{
    if(!state.pickerIsActive){
      alert("Inactive: toggle Active on Dashboard");
      goView("#view-dashboard");
      return;
    }
    autoAssignOrder();
  };

  $("#btnStartWeighAlt")?.addEventListener("click", ()=>{
    if(!state.pickerIsActive){ alert("Inactive – cannot start weigh"); return; }
    if(!state.currentOrder){ alert("No order assigned yet"); return; }
    startWeighFromPick();
  });

  if(state.pickerIsActive){ autoAssignOrder(); }

  if (window.matchMedia("(max-width: 960px)").matches) {
    document.body.classList.remove("sidebar-open");
  }
}

document.addEventListener("DOMContentLoaded", init);
