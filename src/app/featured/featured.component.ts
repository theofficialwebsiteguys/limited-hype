import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Product } from '../models/product';
import { ProductService } from '../product.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-featured',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './featured.component.html',
  styleUrls: ['./featured.component.scss']
})
export class FeaturedComponent implements OnInit {
  featured$!: Observable<Product[]>;
  featuredProducts: Product[] = [];
  allProducts: Product[] = [];
  displayedProducts: Product[] = [];
  loadingFeatured = true;
  loadingAll = true;
  productsToShow = 20;
  currentIndex = 0;

  constructor(private productService: ProductService, private router: Router) {}

  ngOnInit() {
    this.productService.getFeaturedProducts().subscribe(
      (products: Product[]) => {
        this.featuredProducts = products;
        this.loadingFeatured = false;
      },
      (error: any) => {
        console.error('Error fetching all products', error);
        this.loadingFeatured = false;
      }
    );
    this.productService.getAllOrganizedProducts().subscribe(
      (products: Product[]) => {
        this.allProducts = products;
        console.log(this.allProducts)
        this.displayMoreProducts();
        this.loadingAll = false;
      },
      (error: any) => {
        console.error('Error fetching all products', error);
        this.loadingAll = false;
      }
    );
  }

  displayMoreProducts() {
    const nextIndex = this.currentIndex + this.productsToShow;
    this.displayedProducts = [
      ...this.displayedProducts,
      ...this.allProducts.slice(this.currentIndex, nextIndex)
    ];
    this.currentIndex = nextIndex;
  }

  viewProductDetail(product: any): void {
    this.router.navigate(['/item', product.id], { state: { product } });
  }

  getMinPrice(product: Product) {
    if (product.variant && product.variant.length > 0) {
      return Math.min(...product.variant.map(v => parseFloat(v.price)));
    }
    return null;
  }
  
}
