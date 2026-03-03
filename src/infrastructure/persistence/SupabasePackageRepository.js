const PackageRepository = require('../../domain/repositories/PackageRepository')
const Package = require('../../domain/entities/Package')
const supabase = require('../database/supabase')

class SupabasePackageRepository extends PackageRepository {
  async findAll() {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('duration', { ascending: true })

    if (error) throw error
    return data.map(p => this._toEntity(p))
  }

  async findAllActive() {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('duration', { ascending: true })

    if (error) throw error
    return data.map(p => this._toEntity(p))
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data ? this._toEntity(data) : null
  }

  async create(packageData) {
    const { data, error } = await supabase
      .from('packages')
      .insert([{
        name: packageData.name,
        description: packageData.description,
        price: packageData.price,
        duration: packageData.duration,
        features: packageData.features || [],
        badge: packageData.badge,
        is_popular: packageData.isPopular || false,
        is_active: packageData.isActive !== false
      }])
      .select()
      .single()

    if (error) throw error
    return this._toEntity(data)
  }

  async update(id, packageData) {
    const { data, error } = await supabase
      .from('packages')
      .update({
        name: packageData.name,
        description: packageData.description,
        price: packageData.price,
        duration: packageData.duration,
        features: packageData.features,
        badge: packageData.badge,
        is_popular: packageData.isPopular,
        is_active: packageData.isActive
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this._toEntity(data)
  }

  async delete(id) {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', id)

    if (error) throw error
    return true
  }

  // Helper to convert DB row to entity
  _toEntity(row) {
    return new Package({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      duration: row.duration,
      features: row.features || [],
      badge: row.badge,
      isPopular: row.is_popular,
      isActive: row.is_active,
      createdAt: row.created_at
    })
  }
}

module.exports = SupabasePackageRepository
