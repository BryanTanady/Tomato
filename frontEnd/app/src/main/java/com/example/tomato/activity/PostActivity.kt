package com.example.tomato.activity

import com.example.tomato.com.example.tomato.data.ChatItem
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import com.example.tomato.BuildConfig
import com.example.tomato.helper.HTTPRequest
import com.example.tomato.R
import com.example.tomato.helper.UserCredentialManager
import com.example.tomato.helper.commonFunction
import com.google.gson.Gson
import kotlinx.coroutines.launch
import org.json.JSONObject

class PostActivity : AppCompatActivity() {
    private var isOwner: Boolean = false

    companion object {
        private const val TAG = "PostActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_post)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(R.id.main)) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }
        val userId = intent.getStringExtra("userId")
        if (userId == UserCredentialManager.getUserId(this)) {
            isOwner = true
        }
        initLayoutBasedOnOwnership(userId)

        val images = intent.getParcelableArrayListExtra<Uri>("images")
        val location = intent.getStringExtra("location")
        val date = intent.getStringExtra("date")
        val note = intent.getStringExtra("note")
        val private = intent.getBooleanExtra("private", false)
        val postLocation: TextView = findViewById(R.id.post_activity_postLocation)
        postLocation.text = location

        val postDate: TextView = findViewById(R.id.post_activity_postDate)

        // Update post's date
        postDate.text = "Posted on ${commonFunction.convertDateToString(date.toString())}"

        //Update post's note
        val postNote: TextView = findViewById(R.id.post_activity_postNote)
        postNote.text = note

        //Update post's images
        val postViewPager: ViewPager2 = findViewById(R.id.postViewPager)
        postViewPager.adapter = PostAdapter(images!!)

        val darkCard = findViewById<CardView>(R.id.post_activity_dark_card)
        val lightCard = findViewById<CardView>(R.id.post_activity_light_card)

        // Wait until light card is measured before setting dark card height
        lightCard.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                lightCard.viewTreeObserver.removeOnGlobalLayoutListener(this)

                // Get light card's height and apply it to dark card
                val lightCardHeight = lightCard.height
                val layoutParams = darkCard.layoutParams
                layoutParams.height = lightCardHeight
                darkCard.layoutParams = layoutParams
            }
        })

        val backButton = findViewById<ImageView>(R.id.post_back)
        backButton.setOnClickListener {
            finish()
        }
    }

    suspend fun createChat(currentUserId: String, targetUserId: String): ChatItem? {
        val body = JSONObject()
            .put("member_1", currentUserId)
            .put("member_2", targetUserId)
            .toString()

        val response = HTTPRequest.sendPostRequest(
            "${BuildConfig.SERVER_ADDRESS}/chats",
            body,
            this@PostActivity
        )

        if (response != null) {
            val chat = Gson().fromJson(response, ChatItem::class.java)
            return chat
        }
        return null
    }

    private fun initLayoutBasedOnOwnership(userId: String?){
        val sendMessageButton: Button = findViewById(R.id.post_activity_send_message_button)
        val headerText: TextView = findViewById(R.id.post_activity_header_text)
        val deletePostButton: LinearLayout = findViewById(R.id.delete_post_button)
        if (!isOwner) {
            sendMessageButton.visibility = View.VISIBLE
            deletePostButton.visibility = View.GONE
            headerText.text = "Post"
        }
        else {
            sendMessageButton.visibility = View.GONE
            deletePostButton.visibility = View.VISIBLE
            headerText.text = "Your Post"
        }

        sendMessageButton.setOnClickListener {
            val currentUserId = UserCredentialManager.getUserId(this)
            if (userId != null && currentUserId != null && userId != currentUserId) {
                lifecycleScope.launch {
                    val chat = createChat(currentUserId, userId)
                    if (chat != null) {
                        val intent = Intent(this@PostActivity, ChatActivity::class.java)
                        intent.putExtra("chatId", chat.chatId)
                        startActivity(intent)
                    }
                }
            } else {
                Log.d(TAG, "userId or targetUserId is null")
            }
        }

        deletePostButton.setOnClickListener {
            android.app.AlertDialog.Builder(this@PostActivity)
                .setTitle("Are you sure you want to delete this post?")
                .setPositiveButton("Yes") { _, _ ->
                    lifecycleScope.launch {
                        val response = HTTPRequest.sendDeleteRequest("${BuildConfig.SERVER_ADDRESS}/posts/${intent.getStringExtra("postId")}"
                            , this@PostActivity)
                        if(response != null){
                            // Create an intent for MainActivity
                            val intent = Intent(this@PostActivity, MapsActivity::class.java).apply {
                                // Clear the back stack so that the user can't go back to previous screens
                                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
                            }
                            startActivity(intent)
                            Toast.makeText(this@PostActivity, "Post deleted successfully", Toast.LENGTH_SHORT).show()
                            finish() // Finish the current activity
                        }
                        else{
                            Toast.makeText(this@PostActivity, "Failed to delete post", Toast.LENGTH_SHORT).show()
                        }

                    }
                }
                .setNegativeButton("No", null)
                .show()
        }


    }
}

class PostAdapter(private val images: List<Uri>): RecyclerView.Adapter<PostAdapter.PostViewHolder>() {
    class PostViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val postImage: ImageView = itemView.findViewById(R.id.post_activity_postImage)

        fun bind(image: Uri) {
            postImage.setImageURI(image)
        }

    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): PostViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.post_activity_post_item, parent, false)
        return PostViewHolder(view)
    }

    override fun getItemCount(): Int {
        return images.size
    }

    override fun onBindViewHolder(holder: PostViewHolder, position: Int) {
        holder.bind(images[position])
    }


}