// Abrir el modal para agregar la orden
document.getElementById('addOrderButton').onclick = function() {
    document.getElementById('addOrderModal').style.display = 'block';
    
    // Llenar el primer select de productos
    const firstProductSelect = document.querySelector('.productSelect');
    loadProducts(firstProductSelect);
};

// Cerrar el modal
document.querySelector('.close').onclick = function() {
    closeModal();
};

// Opción para cancelar
document.getElementById('cancel-btn').onclick = function() {
    closeModal();
};

// Función para cerrar el modal
function closeModal() {
    document.getElementById('addOrderModal').style.display = 'none';
}

// Agregar un nuevo campo de producto
document.getElementById('addProductToOrder').onclick = function() {
    const productsContainer = document.getElementById('productsContainer');
    const newProductEntry = document.createElement('div');
    newProductEntry.classList.add('product-entry');

    newProductEntry.innerHTML = `
        <select class="productSelect" required>
            <!-- Opciones de productos se llenarán aquí -->
        </select>
        <input type="number" class="productQuantity" placeholder="Cantidad" required>
        <button type="button" class="removeProductButton">Eliminar</button>
    `;

    // Llenar el select de productos del nuevo campo
    const newSelect = newProductEntry.querySelector('.productSelect');
    loadProducts(newSelect);

    // Eliminar un producto si se selecciona la opción de eliminar
    newProductEntry.querySelector('.removeProductButton').onclick = function() {
        newProductEntry.remove();
    };

    productsContainer.appendChild(newProductEntry);
};

// Envío del formulario para agregar la orden
document.getElementById('addOrderForm').onsubmit = function(event) {
    event.preventDefault();

    const status = document.getElementById('orderStatusSelect').value;
    const statusText = orderStatusSelect.options[orderStatusSelect.selectedIndex].text;
    const products = Array.from(document.querySelectorAll('.productSelect')).map(select => select.value);
    const quantity = Array.from(document.querySelectorAll('.productQuantity')).map(input => input.value);

    // Verificar que haya productos y cantidades
    if (products.length === 0 || quantity.length === 0) {
        alert('Debe agregar al menos un producto con su cantidad.');
        return;
    }

    console.log({
        status,
        products,
        quantity
    });

    // Enviar los datos al servidor para crear la orden
    fetch('/addOrder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            status,
            products,
            quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Actualizar la tabla de detalles de la orden
            const orderDetailsTableBody = document.querySelector('#orderDetailsTable tbody');
            orderDetailsTableBody.innerHTML = ''; // Limpiar la tabla


            const productNames = data.products.map(product => product.productName).join(', ');
            const formatDate = (dateString) => {
                const date = new Date(dateString);
                return new Intl.DateTimeFormat('es-GT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }).format(date);
            };

            // Actualizar la tabla de órdenes principales
            const ordersTableBody = document.querySelector('#ordersTable tbody');
            const formattedDate = formatDate(data.order.dateCreation);
            const newRow = `
                <tr>
                    <td>${data.order.idOrder}</td>
                    <td>${productNames}</td>
                    <td>${data.order.totalQuantity}</td>
                    <td>${data.order.dateCreation}</td>
                    <td>${formattedDate}</td>
                    <td>${statusText}</td>
                    <td><button class="edit">Editar</button> <button class="delete">Eliminar</button></td>
                </tr>
            `;
            ordersTableBody.insertAdjacentHTML('beforeend', newRow);

            // Cerrar el modal y resetear el formulario
            closeModal();
            document.getElementById('addOrderForm').reset();
        }
    })
    .catch(error => console.error('Error:', error));
};


// Función para cargar productos en el select
function loadProducts(selectElement) {
    fetch('/getProducts') // Cambia esta URL según tu configuración
        .then(response => response.json())
        .then(data => {
            selectElement.innerHTML = ''; // Limpiar opciones anteriores
            data.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id; // Ajusta según la estructura de tu producto
                option.textContent = product.name; // Ajusta según la estructura de tu producto
                selectElement.appendChild(option);
            });
        })
        .catch(error => console.error('Error al cargar productos:', error));
}
