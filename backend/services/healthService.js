const path = require('path');
const fs = require('fs').promises;

const servicesFilePath = path.join(__dirname, '..', '..' ,'database', 'RegisteredServices.json');

async function getAllServices() {
    try {
        const fileContent = await fs.readFile(servicesFilePath, 'utf8');
        const services = fileContent ? JSON.parse(fileContent) : [];
        return services;

    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`Services file not found at ${servicesFilePath}, returning an empty array.`);
            return [];
        } else {
            console.error('Error reading services file:', error);
            throw error;
        }
    }
}

async function updateService(serviceId, updatedService) {
    try {
        const services = await getAllServices(); // Read existing services
        const index = services.findIndex(service => service.id === serviceId);

        if (index === -1) {
            throw new Error(`Service with ID ${serviceId} not found.`);
        }

        // Update the service properties
        services[index] = { ...services[index], ...updatedService };

        // Write the updated array back to the file
        await fs.writeFile(servicesFilePath, JSON.stringify(services, null, 2), 'utf8');
        console.log(`Service with ID ${serviceId} updated successfully.`);

    } catch (error) {
        console.error('Error updating service:', error);
        throw error; // Re-throw the error for the caller to handle
    }
}

module.exports = { getAllServices, updateService };
