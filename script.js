document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded");

    const someElement = document.getElementById("someElementId");
    if (someElement) {
        someElement.textContent = "Hello!";
    } else {
        console.warn("Element with ID 'someElementId' not found.");
    }

    const toggleButton = document.querySelector(".navbar-toggle");
    const menu = document.getElementById("navbarMenu");

    if (toggleButton && menu) {
        toggleButton.addEventListener("click", function () {
            menu.classList.toggle("active");
        });
    } else {
        console.warn("Navbar elements not found.");
    }
});
