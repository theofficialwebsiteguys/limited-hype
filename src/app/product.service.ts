import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Product } from './models/product';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private apiUrl = 'https://limited-hype-server-fc852c1e4c1b.herokuapp.com/api/products'; // URL of your Node.js server
  //private apiUrl = 'http://localhost:3000/api/products';
  private organizedProductsSubject = new BehaviorSubject<Product[]>(this.loadProducts());
  organizedProducts$ = this.organizedProductsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.fetchProductsFromServer();
  }

  private getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private fetchProductsFromServer(): void {
    this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders(), withCredentials: true }).pipe(
      map(data => {
        console.log(data);
        const organizedProductsMap = new Map<string, Product>();
        const variants: any[] = [];
        let productIdCounter = 0;
  
        data.forEach((product: any) => {
          if (product.name.includes("GRAND OPENING") || product.brand?.name === "Timberland") {
            return;
          }
          const variantParentId = product.variant_parent_id;
          const featured = product.categories[0]?.name === 'featured';
          const tag = featured ? product.categories[1]?.name : product.categories[0]?.name;
  
          if (!variantParentId) {
            // It's a parent product
            const newProduct = new Product(
              product.id,
              productIdCounter++,
              product.name,
              product.image_url,
              product.images.length > 1 ? product.images[1].url : '',
              product.brand?.name,
              featured,
              tag,
              product.product_category?.name,
              [{ originalVariantProductId: '', size: product.variant_options[0]?.value, price: product.price_including_tax }]
            );
            organizedProductsMap.set(product.id, newProduct);
          } else {
            // It's a variant
            variants.push(product);
            // Ensure a placeholder for parent if not already present
            if (!organizedProductsMap.has(variantParentId)) {
              const placeholderProduct = new Product(
                variantParentId,
                productIdCounter++,
                '', // Placeholder name
                '', // Placeholder image URL
                '',
                '', // Placeholder brand
                false, // Placeholder featured flag
                '',
                '',
                []
              );
              organizedProductsMap.set(variantParentId, placeholderProduct);
            }
          }
        });
  
        // Process variants and associate them with their parent products
        variants.forEach(variant => {
          const parentProduct = organizedProductsMap.get(variant.variant_parent_id);
          if (parentProduct) {
            parentProduct.variant.push({
              originalVariantProductId: variant.id,
              size: variant.variant_options[0]?.value,
              price: variant.price_including_tax
            });
  
            // If the placeholder parent has empty details, fill them with the first variant's details
            if (!parentProduct.name && !parentProduct.imageUrl && !parentProduct.brand) {
              parentProduct.name = variant.name;
              parentProduct.imageUrl = variant.skuImages[0]?.url ? variant.skuImages[0].url : variant.image_url;
              parentProduct.brand = variant.brand?.name;
              parentProduct.category = variant.product_category?.name;
            }
          }
        });
  
        // Ensure placeholders are updated with actual parent product data
        data.forEach((product: any) => {
          if (!product.variant_parent_id && organizedProductsMap.has(product.id)) {
            const parentProduct = organizedProductsMap.get(product.id);
            if (parentProduct) {
              parentProduct.name = product.name;
              parentProduct.imageUrl = product.image_url;
              parentProduct.brand = product.brand?.name;
              parentProduct.featured = product.categories[0]?.name === 'featured';
              parentProduct.category = product.product_category?.name;
            }
          }
        });
  
        const organizedProducts = Array.from(organizedProductsMap.values());
        organizedProducts.sort((a, b) => a.name.localeCompare(b.name));
        this.saveProducts(organizedProducts);
        console.log(organizedProducts);
        return organizedProducts;
      }),
      tap(products => this.organizedProductsSubject.next(products))
    ).subscribe();
  }
  
  
  getProductInventory(id: string): Observable<any> {
    return this.http.get<any>(this.apiUrl + `/${id}/inventory`, { headers: this.getHeaders(), withCredentials: true });
  }

  getAllOrganizedProducts(): Observable<Product[]> {
    return this.organizedProducts$;
    // return this.organizedProducts$.pipe(
    //   map(products => products.filter(product => !product.imageUrl.endsWith('no-image-white-standard.png')))
    // );
  }

  getNikeProducts(): Observable<Product[]> {
    return this.organizedProducts$.pipe(
      map(products => products.filter(product => product.brand === 'Nike' || product.brand === 'Nike SB'|| product.brand === 'Nike Dunk'|| product.brand === 'Nike Air Max'))
    );
  }

  getJordanProducts(): Observable<Product[]> {
    return this.organizedProducts$.pipe(
      map(products => products.filter(product => product.brand === 'Jordan'))
    );
  }

  getYeezyProducts(): Observable<Product[]> {
    return this.organizedProducts$.pipe(
      map(products => products.filter(product => product.brand === 'Yeezy'))
    );
  }

  getClothingProducts(): Observable<Product[]> {
    return this.organizedProducts$.pipe(
      map(products => products.filter(product => ['Denim Tears', 'Essentials', 'Bape', 'Limited Hype', 'Pharaoh Collections', 'Hellstar', 'Eric Emanuel', 'Kaws', 'Supreme'].includes(product.brand)))
    );
  }

  getFeaturedProducts(): Observable<Product[]> {
    return this.organizedProducts$.pipe(
      map(products => products.filter(product => product.featured))
    );
  }

  getProductById(id: string): Observable<Product | undefined> {
    return this.organizedProducts$.pipe(
      map(products => products.find(product => product.id.toString() === id))
    );
  }

  private saveProducts(products: Product[]): void {
    localStorage.setItem('products', JSON.stringify(products));
  }

  private loadProducts(): Product[] {
    const savedProducts = localStorage.getItem('products');
    return savedProducts ? JSON.parse(savedProducts) : [];
  }
}
