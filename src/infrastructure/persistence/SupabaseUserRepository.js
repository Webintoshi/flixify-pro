/**
 * Supabase User Repository Implementation
 * 
 * Infrastructure adapter implementing UserRepository port.
 * Uses Supabase PostgreSQL with RLS policies.
 * 
 * Error Handling Strategy:
 * - Database errors: Log and throw domain-specific errors
 * - Connection errors: Throw ServiceUnavailableError
 * - Constraint violations: Throw ConflictError
 * - Not found: Return null (domain layer decides on 404)
 */

const UserRepository = require('../../application/ports/UserRepository');
const User = require('../../domain/entities/User');
const logger = require('../../config/logger');

class SupabaseUserRepository extends UserRepository {
  constructor(supabaseClient) {
    super();
    this._supabase = supabaseClient;
    this._table = 'users';
  }

  /**
   * Map database row to domain entity
   */
  _toDomain(data) {
    if (!data) return null;
    return User.reconstitute({
      id: data.id,
      code: data.code,
      status: data.status,
      m3uUrl: data.m3u_url,
      expiresAt: data.expires_at,
      adminNotes: data.admin_notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    });
  }

  /**
   * Map domain entity to database row
   */
  _toPersistence(user) {
    return user.toPersistence();
  }

  async findById(id) {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this._toDomain(data);
    } catch (error) {
      logger.error('Database error in findById', { error: error.message, id });
      throw new Error(`Failed to find user by ID: ${error.message}`);
    }
  }

  async findByCode(code) {
    try {
      const codeString = code.toString ? code.toString() : code;
      
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('code', codeString)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return this._toDomain(data);
    } catch (error) {
      logger.error('Database error in findByCode', { error: error.message, code: code.toMaskedString?.() || code });
      throw new Error(`Failed to find user by code: ${error.message}`);
    }
  }

  async findAll({ limit = 50, offset = 0, status = null } = {}) {
    try {
      let query = this._supabase
        .from(this._table)
        .select('*', { count: 'exact' });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        users: data.map(row => this._toDomain(row)),
        total: count || 0
      };
    } catch (error) {
      logger.error('Database error in findAll', { error: error.message, limit, offset, status });
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async findByStatus(status) {
    try {
      const statusString = status.toString ? status.toString() : status;
      
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('status', statusString);

      if (error) throw error;

      return data.map(row => this._toDomain(row));
    } catch (error) {
      logger.error('Database error in findByStatus', { error: error.message, status });
      throw new Error(`Failed to find users by status: ${error.message}`);
    }
  }

  async findExpired() {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('status', 'active')
        .lt('expires_at', now)
        .not('expires_at', 'is', null);

      if (error) throw error;

      return data.map(row => this._toDomain(row));
    } catch (error) {
      logger.error('Database error in findExpired', { error: error.message });
      throw new Error(`Failed to find expired users: ${error.message}`);
    }
  }

  async save(user) {
    try {
      const persistence = this._toPersistence(user);
      delete persistence.id; // Let DB generate UUID

      const { data, error } = await this._supabase
        .from(this._table)
        .insert(persistence)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error(`User with code ${user.code.toString()} already exists`);
        }
        throw error;
      }

      logger.info('User saved successfully', { code: user.code.toMaskedString() });
      return this._toDomain(data);
    } catch (error) {
      logger.error('Database error in save', { error: error.message, code: user.code.toMaskedString() });
      throw new Error(`Failed to save user: ${error.message}`);
    }
  }

  async update(user) {
    try {
      if (!user.id) {
        throw new Error('Cannot update user without ID');
      }

      const persistence = this._toPersistence(user);

      const { data, error } = await this._supabase
        .from(this._table)
        .update(persistence)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      logger.info('User updated successfully', { id: user.id, code: user.code.toMaskedString() });
      return this._toDomain(data);
    } catch (error) {
      logger.error('Database error in update', { error: error.message, id: user.id });
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const { error } = await this._supabase
        .from(this._table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      logger.info('User deleted successfully', { id });
    } catch (error) {
      logger.error('Database error in delete', { error: error.message, id });
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async existsByCode(code) {
    try {
      const codeString = code.toString ? code.toString() : code;
      
      const { count, error } = await this._supabase
        .from(this._table)
        .select('*', { count: 'exact', head: true })
        .eq('code', codeString);

      if (error) throw error;

      return count > 0;
    } catch (error) {
      logger.error('Database error in existsByCode', { error: error.message });
      throw new Error(`Failed to check code existence: ${error.message}`);
    }
  }

  async countByStatus() {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .select('status', { count: 'exact' });

      if (error) throw error;

      const counts = {
        pending: 0,
        active: 0,
        suspended: 0,
        expired: 0,
        total: data.length
      };

      data.forEach(row => {
        if (counts[row.status] !== undefined) {
          counts[row.status]++;
        }
      });

      return counts;
    } catch (error) {
      logger.error('Database error in countByStatus', { error: error.message });
      throw new Error(`Failed to count users by status: ${error.message}`);
    }
  }

  async findRecent(days = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(row => this._toDomain(row));
    } catch (error) {
      logger.error('Database error in findRecent', { error: error.message, days });
      return [];
    }
  }
}

module.exports = SupabaseUserRepository;
