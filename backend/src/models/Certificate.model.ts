import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import crypto from 'crypto';

interface CertificateAttributes {
  id: number;
  tenant_id: number;
  user_id: number;
  certificate_type: 'quiz' | 'program' | 'classroom' | 'tenant';
  related_id?: number;
  name: string;
  verification_code: string;
  issued_date: Date;
  expiry_date?: Date;
  metadata: object;
  pdf_url?: string;
}

interface CertificateCreationAttributes extends Optional<CertificateAttributes, 'id' | 'related_id' | 'verification_code' | 'issued_date' | 'expiry_date' | 'metadata' | 'pdf_url'> {}

class Certificate extends Model<CertificateAttributes, CertificateCreationAttributes> implements CertificateAttributes {
  public id!: number;
  public tenant_id!: number;
  public user_id!: number;
  public certificate_type!: 'quiz' | 'program' | 'classroom' | 'tenant';
  public related_id?: number;
  public name!: string;
  public verification_code!: string;
  public issued_date!: Date;
  public expiry_date?: Date;
  public metadata!: object;
  public pdf_url?: string;

  // Associations
  static associate(models: any) {
    Certificate.belongsTo(models.Tenant, {
      foreignKey: 'tenant_id',
      as: 'tenant'
    });

    Certificate.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  }

  static initModel(sequelize: Sequelize): typeof Certificate {
    Certificate.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        tenant_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          }
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          }
        },
        certificate_type: {
          type: DataTypes.ENUM('quiz', 'program', 'classroom', 'tenant'),
          allowNull: false
        },
        related_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },
        verification_code: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true
        },
        issued_date: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        expiry_date: {
          type: DataTypes.DATE,
          allowNull: true
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {}
        },
        pdf_url: {
          type: DataTypes.STRING(500),
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Certificate',
        tableName: 'certificates',
        underscored: true,
        timestamps: false,
        hooks: {
          beforeValidate: (certificate: Certificate) => {
            // Generate unique verification code if not provided
            if (!certificate.verification_code) {
              const timestamp = Date.now().toString(36);
              const random = crypto.randomBytes(8).toString('hex');
              certificate.verification_code = `CERT-${timestamp.toUpperCase()}-${random.toUpperCase()}`;
            }
          }
        }
      }
    );

    return Certificate;
  }

  // Helper methods
  isValid(): boolean {
    if (!this.expiry_date) {
      return true;
    }
    return new Date() <= this.expiry_date;
  }

  isExpired(): boolean {
    return !this.isValid();
  }

  getDaysUntilExpiry(): number | null {
    if (!this.expiry_date) {
      return null;
    }
    const now = new Date();
    const diff = this.expiry_date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getMetadata(key: string, defaultValue: any = null): any {
    return (this.metadata as any)[key] || defaultValue;
  }

  async getRelatedEntity(): Promise<any> {
    const models = (this.constructor as any).sequelize.models;
    
    switch (this.certificate_type) {
      case 'quiz':
        return models.Quiz.findByPk(this.related_id);
      case 'program':
        return models.TrainingProgram.findByPk(this.related_id);
      case 'classroom':
        return models.Classroom.findByPk(this.related_id);
      case 'tenant':
        return models.Tenant.findByPk(this.related_id || this.tenant_id);
      default:
        return null;
    }
  }

  async generateVerificationUrl(baseUrl: string): Promise<string> {
    return `${baseUrl}/certificates/verify/${this.verification_code}`;
  }

  static async verifyCertificate(code: string): Promise<{
    valid: boolean;
    certificate?: Certificate;
    message: string;
  }> {
    const certificate = await Certificate.findOne({
      where: { verification_code: code },
      include: [
        { association: 'user', attributes: ['id', 'name', 'email'] },
        { association: 'tenant', attributes: ['id', 'name'] }
      ]
    });

    if (!certificate) {
      return {
        valid: false,
        message: 'Certificate not found'
      };
    }

    if (certificate.isExpired()) {
      return {
        valid: false,
        certificate,
        message: 'Certificate has expired'
      };
    }

    return {
      valid: true,
      certificate,
      message: 'Certificate is valid'
    };
  }

  static async issueCertificate(data: {
    tenant_id: number;
    user_id: number;
    type: 'quiz' | 'program' | 'classroom' | 'tenant';
    related_id?: number;
    name: string;
    metadata?: object;
    expiry_date?: Date;
  }): Promise<Certificate> {
    // Check if similar certificate already exists
    const existing = await Certificate.findOne({
      where: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        certificate_type: data.type,
        related_id: data.related_id || null
      },
      order: [['issued_date', 'DESC']]
    });

    // If exists and still valid, return existing
    if (existing && existing.isValid()) {
      return existing;
    }

    // Create new certificate
    return Certificate.create({
      tenant_id: data.tenant_id,
      user_id: data.user_id,
      certificate_type: data.type,
      related_id: data.related_id,
      name: data.name,
      metadata: data.metadata || {},
      expiry_date: data.expiry_date
    });
  }
}

export default Certificate;