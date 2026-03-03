const PackageRepository = require('../../domain/repositories/PackageRepository')
const Package = require('../../domain/entities/Package')
const supabase = require('../database/supabase')

class SupabasePackageRepository extends PackageRepository {
  async findAll() {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return data.map(p => this._toEntity(p))
  }

  async findAllActive() {
    const { data, error } = await supabase
      .from('packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

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
    // duration ay olarak geliyorsa gün'e çevir (30 gün = 1 ay)
    const durationInput = packageData.duration_days || packageData.duration || 30
    const durationDays = durationInput <= 12 ? durationInput * 30 : durationInput
    
    // Veritabanı yapısına uygun alanlar
    const dbData = {
      name: packageData.name,
      description: packageData.description,
      price: packageData.price,
      duration_days: durationDays,
      features: packageData.features || [],
      is_active: packageData.isActive !== false,
      sort_order: packageData.sort_order || this._calculateSortOrder(durationDays)
    }

    const { data, error } = await supabase
      .from('packages')
      .insert([dbData])
      .select()
      .single()

    if (error) throw error
    return this._toEntity(data)
  }

  async update(id, packageData) {
    // duration ay olarak geliyorsa gün'e çevir (30 gün = 1 ay)
    const durationInput = packageData.duration_days || packageData.duration
    const durationDays = durationInput && durationInput <= 12 ? durationInput * 30 : durationInput
    
    // Veritabanı yapısına uygun alanlar
    const dbData = {
      name: packageData.name,
      description: packageData.description,
      price: packageData.price,
      duration_days: durationDays,
      features: packageData.features,
      is_active: packageData.isActive,
      sort_order: packageData.sort_order !== undefined ? packageData.sort_order : (durationDays ? this._calculateSortOrder(durationDays) : undefined)
    }

    // undefined değerleri temizle
    Object.keys(dbData).forEach(key => {
      if (dbData[key] === undefined) delete dbData[key]
    })

    const { data, error } = await supabase
      .from('packages')
      .update(dbData)
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

  // Helper: duration_days'a göre sort_order hesapla
  _calculateSortOrder(duration) {
    const days = parseInt(duration) || 30
    if (days >= 365) return 4
    if (days >= 180) return 3
    if (days >= 90) return 2
    return 1
  }

  // Helper: DB row -> Entity
  _toEntity(row) {
    return new Package({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      duration_days: row.duration_days,
      features: row.features || [],
      isActive: row.is_active,
      sort_order: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }
}

module.exports = SupabasePackageRepository
