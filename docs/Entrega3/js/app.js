document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.split("/").pop();
    const links = document.querySelectorAll("nav a");
    links.forEach(link => {
    const href = link.getAttribute("href");
    if (href === path) {
        link.classList.add("active");
    }
    if (path === "" && href === "index.html") {
        link.classList.add("active");
    }
    });
});

function mostrarAviso(texto = "Acción simulada") {
    alert(texto);
}