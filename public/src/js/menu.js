document.addEventListener('DOMContentLoaded', function() {
    const bubbleMenu = document.querySelector('.bubble-menu');
    const menuItems = bubbleMenu.querySelector('.menu-items');

    bubbleMenu.addEventListener('click', function(event) {
        event.stopPropagation(); // Evita que el clic en el burbuja cierre el menú
        this.classList.toggle('active'); // Alterna la clase para mostrar/ocultar el menú
    });

    document.addEventListener('click', function() {
        if (bubbleMenu.classList.contains('active')) {
            bubbleMenu.classList.remove('active'); // Cierra el menú si está abierto
        }
    });
});
