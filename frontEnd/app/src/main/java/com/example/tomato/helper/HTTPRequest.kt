package com.example.tomato.helper

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

object HTTPRequest {

    /**
     * Sends a GET request to the specified URL.
     */
    suspend fun sendGetRequest(url: String, context: Context): String? {

        // Use IO dis:patcher to perform network operations (connect to backend)
        return withContext(Dispatchers.IO){
            val client = OkHttpClient()

            val token = JwtManager.getToken(context)
            val request = Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer $token") // Attach the JWT
                .build()

            try {
                // Execute the request synchronously on the IO dispatcher
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        Log.e("HTTPRequest", "Unexpected code $response")
                        Log.d("HTTPRequest", "Response body: ${response.body?.string()}")
                        throw IOException("Unexpected code $response")
                    }
                    // Return the response data as a String
                    response.body?.string()
                }
            } catch (e: IOException) {
                e.printStackTrace()
                null
            } catch (e: IllegalStateException) {
                e.printStackTrace()
                null
            } catch (e: SecurityException) {
                e.printStackTrace()
                null
            }
        }
    }

    /**
     * Sends a DELETE request to the specified URL.
     */
    suspend fun sendDeleteRequest(url: String, context: Context): String? {

        // Use IO dispatcher to perform network operations (connect to backend)
        return withContext(Dispatchers.IO){
            val client = OkHttpClient()

            val token = JwtManager.getToken(context)
            val request = Request.Builder()
                .url(url)
                .addHeader("Authorization", "Bearer $token") // Attach the JWT
                .delete()
                .build()

            try {
                // Execute the request synchronously on the IO dispatcher
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        throw IOException("Unexpected code $response")
                    }
                    // Return the response data as a String
                    response.body?.string()
                }
            } catch (e: IOException) {
                e.printStackTrace()
                null
            } catch (e: IllegalStateException) {
                e.printStackTrace()
                null
            } catch (e: SecurityException) {
                e.printStackTrace()
                null
            }
        }
    }



    /**
     * Sends a POST request to the specified URL with the provided request body.
     * @param stringifiedBody: the body in stringified json format, e.g. """{"token": "$token"}""".
     * @return On success returns the data returned by the server as a String, otherwise returns null,
     * and the error message is printed on Log
     */
    suspend fun sendPostRequest(url: String, stringifiedBody: String, context: Context): String? {


        val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
        val body = stringifiedBody.toRequestBody(mediaType)

        // Use IO dispatcher to perform network operations (connect to backend)
        return withContext(Dispatchers.IO){
            val client = OkHttpClient()

            val token = JwtManager.getToken(context)

            val request = Request.Builder()
                .url(url)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .addHeader("Authorization", "Bearer $token") // Attach the JWT
                .build()

            try {
                // Execute the request synchronously on the IO dispatcher
                client.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        throw IOException("Unexpected code $response")
                    }
                    // Return the response data as a String
                    response.body?.string()
                }
            } catch (e: IOException) {
                e.printStackTrace()
                null
            } catch (e: IllegalStateException) {
                e.printStackTrace()
                null
            } catch (e: SecurityException) {
                e.printStackTrace()
                null
            }
        }
    }


}