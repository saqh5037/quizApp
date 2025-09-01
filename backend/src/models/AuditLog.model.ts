import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

interface AuditLogAttributes {
  id: number;
  user_id?: number;
  tenant_id?: number;
  action: string;
  entity_type?: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at?: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public user_id?: number;
  public tenant_id?: number;
  public action!: string;
  public entity_type?: string;
  public entity_id?: number;
  public old_values?: any;
  public new_values?: any;
  public ip_address?: string;
  public user_agent?: string;
  public metadata?: any;
  public readonly created_at!: Date;

  // Associations
  static associate(models: any) {
    AuditLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    AuditLog.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });
  }

  static initModel(sequelize: Sequelize): typeof AuditLog {
    AuditLog.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        tenant_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'tenants',
            key: 'id'
          },
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        },
        action: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        entity_type: {
          type: DataTypes.STRING(100),
          allowNull: true
        },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        old_values: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        new_values: {
          type: DataTypes.JSONB,
          allowNull: true
        },
        ip_address: {
          type: DataTypes.STRING(45), // Support IPv6
          allowNull: true
        },
        user_agent: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'AuditLog',
        tableName: 'audit_logs',
        underscored: true,
        timestamps: false,
        createdAt: 'created_at',
        indexes: [
          {
            fields: ['user_id']
          },
          {
            fields: ['tenant_id']
          },
          {
            fields: ['entity_type', 'entity_id']
          },
          {
            fields: ['action']
          },
          {
            fields: ['created_at']
          }
        ]
      }
    );

    return AuditLog;
  }

  // Static method to log actions
  static async logAction(
    action: string,
    userId?: number,
    tenantId?: number,
    entityType?: string,
    entityId?: number,
    oldValues?: any,
    newValues?: any,
    req?: any
  ): Promise<AuditLog> {
    const logData: AuditLogCreationAttributes = {
      action,
      user_id: userId,
      tenant_id: tenantId,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      created_at: new Date()
    };

    if (req) {
      logData.ip_address = req.ip || req.connection?.remoteAddress;
      logData.user_agent = req.headers['user-agent'];
      logData.metadata = {
        method: req.method,
        path: req.path,
        query: req.query,
        body: req.body ? Object.keys(req.body) : null // Don't log sensitive data
      };
    }

    return await AuditLog.create(logData);
  }

  // Helper method to format log for display
  getFormattedAction(): string {
    let formatted = `${this.action}`;
    
    if (this.entity_type && this.entity_id) {
      formatted += ` on ${this.entity_type} #${this.entity_id}`;
    }
    
    return formatted;
  }

  // Get changes between old and new values
  getChanges(): any[] {
    const changes = [];
    
    if (this.old_values && this.new_values) {
      const oldKeys = Object.keys(this.old_values);
      const newKeys = Object.keys(this.new_values);
      const allKeys = new Set([...oldKeys, ...newKeys]);
      
      for (const key of allKeys) {
        const oldVal = this.old_values[key];
        const newVal = this.new_values[key];
        
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push({
            field: key,
            old: oldVal,
            new: newVal
          });
        }
      }
    }
    
    return changes;
  }
}

export default AuditLog;