// 生成物: scripts/build-genkan.ts が src/mapintent.ts から作る。直接は編集しない。
/**
 * MapIntent(地理院方言)。
 *
 * 地理院地図の URL ハッシュを、その文法のまま忠実に写した中間表現。
 * 文法の根拠は docs/url-grammar.md を参照。
 *
 * 「地図の意図」(map) と「画面の状態」(screen) を分けて持つ。
 * 問い(自然言語)との対応づけに使うのは map だけ。screen は往復のために保持する。
 */

                           
                                                            
             
                                                
                  
                                   
                  
 

                             
               
              
              
 

/** 地図の意図: 何を、どこで、どう重ねて見せるか。 */
                             
                   
                                                                           
                
                           
                          
                                
                     
 

/**
 * 画面の状態: 往復のために保持するが、問いとの対応づけには使わない。
 * 値は URL 上の文字列のまま(デコード済み)持つ。解釈は vsFlags() などの補助関数で行う。
 */
                                
                                      
               
                       
              
                                                   
              
                                           
             
                                                      
                 
 

                               
                     
                  
                        
     
                                                                  
                                     
     
                                                    
 

                              
                       
                                        
                     
 

export class GsiUrlError extends Error {}
