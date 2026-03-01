/**
 * Supabase Package Repository Implementation
 */

const logger = require('../../config/logger');

class SupabasePackageRepository {
  constructor(supabaseClient) {
    this._supabase = supabaseClient;
    this._table = 'packages';
  }

  async findAll() {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      logger.error('Database error in findAll', { error: error.message });
      throw error;
    }
  }

  async findById(id) {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Database error in findById', { error: error.message });
      throw error;
    }
  }

  async create(packageData) {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .insert(packageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Database error in create', { error: error.message });
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const { data, error } = await this._supabase
        .from(this._table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Database error in update', { error: error.message });
      throw error;
    }
  }

  async delete(id) {
    try {
      const { error } = await this._supabase
        .from(this._table)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Database error in delete', { error: error.message });
      throw error;
    }
  }
}

module.exports = SupabasePackageRepository;
