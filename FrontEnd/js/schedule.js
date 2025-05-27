document.addEventListener("DOMContentLoaded", () => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const tbody = document.querySelector("tbody");

  // Fake DB request for shift data
  const fetchShifts = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { name: "Morning", start: "06:00", end: "12:00" },
          { name: "Afternoon", start: "12:00", end: "18:00" },
          { name: "Evening", start: "18:00", end: "00:00" },
          { name: "Late Night", start: "00:00", end: "06:00" },
        ]);
      }, 50); // Simulate delay
    });
  };

  const createScheduleTable = async () => {
    const shifts = await fetchShifts();
    tbody.innerHTML = ""; // clear static content

    shifts.forEach((shift) => {
      const row = document.createElement("tr");

      const shiftLabel = document.createElement("td");
      shiftLabel.innerHTML = `${shift.name} <br>(${formatTime(
        shift.start
      )} - ${formatTime(shift.end)})`;
      row.appendChild(shiftLabel);

      days.forEach((day) => {
        const td = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.name = day;
        checkbox.value = shift.name;
        td.appendChild(checkbox);
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });
  };

  const formatTime = (timeStr) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 && hour < 24 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12} ${suffix}`;
  };

  createScheduleTable();

  document
    .getElementById("scheduleForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      const schedule = {};

      days.forEach((day) => {
        const checkedShifts = Array.from(
          document.querySelectorAll(`input[name="${day}"]:checked`)
        ).map((cb) => cb.value);
        if (checkedShifts.length > 0) {
          schedule[day] = checkedShifts;
        }
      });

      if (Object.keys(schedule).length === 0) {
        alert("Please select at least one shift.");
        return;
      }

      let output = "Your selected schedule:\n";
      for (const [day, shifts] of Object.entries(schedule)) {
        output += `${day}: ${shifts.join(", ")}\n`;
      }
      //recomndation : for each shift use a binary representation
      // for example: 0001 for morning, 0010 for afternoom ,etc
      // for both morning and afternoon use 0011 and so on
      // this will make it easier to store in a database
      alert(output);
    });
});
