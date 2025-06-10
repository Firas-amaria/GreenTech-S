

const navButtonsContainer = document.getElementById("sidebar");
//const roleSelector = document.getElementById("user-role");
 updateSideBar("farmer");
function updateSideBar(role) {
  navButtonsContainer.innerHTML = "";
switch (role) {
  case "farmer":
    navButtonsContainer.innerHTML = `
       <h2>Farmer App</h2>
    <ul>
      <li><a href="f_dashboard.html">Dashboard</a></li>
      <li><a href="f_crops.html">Crops</a></li>
      <li><a href="f_shipments.html">Shipments</a></li>
      <li><a href="#" id="logoutLink">Logout</a></li>
    </ul>
    `;
    break;
    default:
    navButtonsContainer.innerHTML = `
       <h2>Farmer App</h2>
    <ul>
      <li><a href="f_dashboard.html">Dashboard</a></li>
      <li><a href="f_crops.html">Crops</a></li>
      <li><a href="f_shipments.html">Shipments</a></li>
      <li><a href="#" id="logoutLink">Logout</a></li>
    </ul>
    `;
    break;
    

}
}

