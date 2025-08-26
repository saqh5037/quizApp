'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if columns exist before adding them
    const table = await queryInterface.describeTable('interactive_video_layers');
    
    const columnsToAdd = [];
    
    if (!table.processing_error) {
      columnsToAdd.push(
        queryInterface.addColumn('interactive_video_layers', 'processing_error', {
          type: Sequelize.TEXT,
          allowNull: true
        })
      );
    }
    
    if (!table.processing_completed_at) {
      columnsToAdd.push(
        queryInterface.addColumn('interactive_video_layers', 'processing_completed_at', {
          type: Sequelize.DATE,
          allowNull: true
        })
      );
    }
    
    return Promise.all(columnsToAdd);
  },

  down: async (queryInterface, Sequelize) => {
    const columnsToRemove = [];
    
    try {
      columnsToRemove.push(
        queryInterface.removeColumn('interactive_video_layers', 'processing_error')
      );
    } catch (error) {
      // Column might not exist
    }
    
    try {
      columnsToRemove.push(
        queryInterface.removeColumn('interactive_video_layers', 'processing_completed_at')
      );
    } catch (error) {
      // Column might not exist
    }
    
    return Promise.all(columnsToRemove);
  }
};