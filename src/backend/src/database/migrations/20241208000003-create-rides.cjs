'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('rides', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      driver_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      origin: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      destination: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      departure_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      available_seats: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price_per_seat: {
        type: Sequelize.FLOAT,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      origin_latitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      origin_longitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      destination_latitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      destination_longitude: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      estimated_duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      departure_city: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      destination_city: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_cancelled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      vehicle_brand: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      vehicle_model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      vehicle_color: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      vehicle_plate: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('rides', ['driver_id']);
    await queryInterface.addIndex('rides', ['departure_time']);
    await queryInterface.addIndex('rides', ['is_active']);
    await queryInterface.addIndex('rides', ['is_completed']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('rides');
  }
};
