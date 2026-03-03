// Package Entity - Simple structure
class Package {
  constructor({
    id,
    name,
    description,
    price,
    duration,
    features = [],
    badge,
    isPopular = false,
    isActive = true,
    createdAt
  }) {
    this.id = id
    this.name = name
    this.description = description
    this.price = price
    this.duration = duration
    this.features = features
    this.badge = badge
    this.isPopular = isPopular
    this.isActive = isActive
    this.createdAt = createdAt
  }

  // Get total price (same as price for simple calculation)
  get totalPrice() {
    return this.price
  }

  // Get monthly price
  get monthlyPrice() {
    return Math.round(this.price / this.duration)
  }
}

module.exports = Package
