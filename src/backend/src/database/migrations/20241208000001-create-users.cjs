'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Crear tabla users
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      hashed_password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      avatar_url: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      home_address: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      home_place_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      home_latitude: {
        type: Sequelize.DOUBLE,
        allowNull: true
      },
      home_longitude: {
        type: Sequelize.DOUBLE,
        allowNull: true
      },
      university: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      degree: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      course: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      stripe_customer_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      stripe_payment_method_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      stripe_account_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bank_account_last4: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bank_account_country: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      bank_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      blocked_trip_ids: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        defaultValue: [],
        allowNull: false
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

    // Crear índices
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['stripe_customer_id']);
    await queryInterface.addIndex('users', ['stripe_account_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};
