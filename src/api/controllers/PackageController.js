const SupabasePackageRepository = require('../../infrastructure/persistence/SupabasePackageRepository')

class PackageController {
  constructor(supabaseClient) {
    this.packageRepo = new SupabasePackageRepository(supabaseClient)
  }

  // GET /api/v1/packages/public - Get all active packages (public)
  async getPublicPackages(req, res) {
    try {
      const packages = await this.packageRepo.findAllActive()
      
      res.json({
        status: 'success',
        data: {
          packages: packages.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            duration: p.durationMonths,  // Ay olarak (1, 3, 6, 12)
            duration_days: p.duration_days,  // Gün olarak (30, 90, 180, 365)
            features: p.features,
            badge: p.badge,
            isPopular: p.isPopular,
            is_active: p.isActive
          }))
        }
      })
    } catch (error) {
      console.error('Get public packages error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Paketler yüklenemedi'
      })
    }
  }

  // GET /api/v1/admin/packages - Get all packages (admin)
  async getAllPackages(req, res) {
    try {
      const packages = await this.packageRepo.findAll()
      
      res.json({
        status: 'success',
        data: {
          packages: packages.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            duration: p.durationMonths,  // Ay olarak (1, 3, 6, 12)
            duration_days: p.duration_days,  // Gün olarak (30, 90, 180, 365)
            features: p.features,
            badge: p.badge,
            isPopular: p.isPopular,
            isActive: p.isActive,
            sort_order: p.sort_order,
            created_at: p.createdAt,
            updated_at: p.updatedAt
          }))
        }
      })
    } catch (error) {
      console.error('Get all packages error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Paketler yüklenemedi'
      })
    }
  }

  // POST /api/v1/admin/packages - Create package (admin)
  async createPackage(req, res) {
    try {
      const packageData = req.body
      const pkg = await this.packageRepo.create(packageData)
      
      res.status(201).json({
        status: 'success',
        data: { package: pkg }
      })
    } catch (error) {
      console.error('Create package error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Paket oluşturulamadı: ' + error.message
      })
    }
  }

  // PUT /api/v1/admin/packages/:id - Update package (admin)
  async updatePackage(req, res) {
    try {
      const { id } = req.params
      const packageData = req.body
      const pkg = await this.packageRepo.update(id, packageData)
      
      res.json({
        status: 'success',
        data: { package: pkg }
      })
    } catch (error) {
      console.error('Update package error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Paket güncellenemedi: ' + error.message
      })
    }
  }

  // DELETE /api/v1/admin/packages/:id - Delete package (admin)
  async deletePackage(req, res) {
    try {
      const { id } = req.params
      await this.packageRepo.delete(id)
      
      res.json({
        status: 'success',
        message: 'Paket silindi'
      })
    } catch (error) {
      console.error('Delete package error:', error)
      res.status(500).json({
        status: 'error',
        message: 'Paket silinemedi: ' + error.message
      })
    }
  }
}

module.exports = PackageController
